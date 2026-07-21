import { revalidatePath, revalidateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { isEligibleRunClubSubmission, isValidMonthKey, RUN_CLUB_DRAW_VERSION, selectSecureWinnerIndex, serializePublicWinner } from "@/lib/run-club/draw";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ monthKey: string }> }) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { monthKey } = await context.params;
  if (!isValidMonthKey(monthKey)) return Response.json({ ok: false, code: "invalid_month", message: "Invalid month." }, { status: 400 });
  const db = getAdminDb();
  try {
    const eligibleSnapshot = await db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "approved").get();
    const eligibleDocs = eligibleSnapshot.docs.filter((doc) => isEligibleRunClubSubmission(doc.data()));
    if (eligibleDocs.length === 0) return Response.json({ ok: false, code: "no_approved_participants", message: "No eligible approved participants for this month." }, { status: 409 });
    const selectedDoc = eligibleDocs[selectSecureWinnerIndex(eligibleDocs.length)];
    const result = await db.runTransaction(async (transaction) => {
      const monthRef = db.collection("runClubMonths").doc(monthKey);
      const monthSnap = await transaction.get(monthRef);
      const existingWinnerId = monthSnap.exists && typeof monthSnap.get("winnerSubmissionId") === "string" ? monthSnap.get("winnerSubmissionId") as string : null;
      if (existingWinnerId) {
        const winnerSnap = await transaction.get(db.collection("runClubSubmissions").doc(existingWinnerId));
        if (!winnerSnap.exists) throw new Error("MISSING_WINNER_SUBMISSION");
        const winner = serializePublicWinner(winnerSnap.id, winnerSnap.data() ?? {}, monthKey, monthSnap.get("winnerSelectedAt"));
        if (!winner) throw new Error("MISSING_WINNER_SUBMISSION");
        return { alreadyDrawn: true, eligibleCount: Number(monthSnap.get("eligibleCountAtDraw") ?? eligibleDocs.length), winner };
      }
      const chosenRef = db.collection("runClubSubmissions").doc(selectedDoc.id);
      const chosenSnap = await transaction.get(chosenRef);
      if (!chosenSnap.exists || !isEligibleRunClubSubmission(chosenSnap.data() ?? {}) || chosenSnap.get("monthKey") !== monthKey) throw new Error("CHOSEN_INELIGIBLE");
      const storedApprovedCount = Number(monthSnap.get("approvedCount") ?? 0);
      if (storedApprovedCount !== eligibleDocs.length) console.warn("[run-club-draw] approved count mismatch", { monthKey, storedApprovedCount, actualEligibleCount: eligibleDocs.length });
      transaction.set(monthRef, { monthKey, drawStatus: "drawn", winnerSubmissionId: chosenSnap.id, winnerSelectedAt: FieldValue.serverTimestamp(), winnerSelectedBy: admin.email, eligibleCountAtDraw: eligibleDocs.length, drawVersion: RUN_CLUB_DRAW_VERSION, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.update(chosenRef, { isWinner: true, winnerMonthKey: monthKey, winnerSelectedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      const winner = serializePublicWinner(chosenSnap.id, chosenSnap.data() ?? {}, monthKey, new Date());
      if (!winner) throw new Error("CHOSEN_INELIGIBLE");
      return { alreadyDrawn: false, eligibleCount: eligibleDocs.length, winner };
    });
    revalidateTag("run-club", "max"); revalidatePath("/"); revalidatePath("/run-club");
    return Response.json({ ok: true, code: result.alreadyDrawn ? "already_drawn" : "winner_drawn", message: result.alreadyDrawn ? "Winner already selected." : "Winner selected and saved.", monthKey, eligibleCount: result.eligibleCount, winner: result.winner });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_WINNER_SUBMISSION") return Response.json({ ok: false, code: "missing_winner_submission", message: "The saved winner submission could not be loaded." }, { status: 409 });
    console.error("[run-club-draw] draw failed");
    return Response.json({ ok: false, code: "draw_failed", message: "Winner draw could not be completed." }, { status: 500 });
  }
}
