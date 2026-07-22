import { revalidatePath, revalidateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getWinnerSubmissionIds, isEligibleRunClubSubmission, isValidMonthKey, normalizeWinnerCount, RUN_CLUB_DRAW_VERSION, selectSecureWinnerIndexes, serializePublicWinner } from "@/lib/run-club/draw";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const drawRequestSchema = z.object({ winnerCount: z.number().int().min(1).max(3).optional() }).optional();

export async function POST(request: Request, context: { params: Promise<{ monthKey: string }> }) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { monthKey } = await context.params;
  if (!isValidMonthKey(monthKey)) return Response.json({ ok: false, code: "invalid_month", message: "Invalid month." }, { status: 400 });
  const requestJson: unknown = await request.json().catch(() => undefined);
  const parsed = drawRequestSchema.safeParse(requestJson);
  if (!parsed.success) return Response.json({ ok: false, code: "validation_failed", message: "Choose between 1 and 3 winners." }, { status: 400 });
  const db = getAdminDb();
  try {
    const eligibleSnapshot = await db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "approved").get();
    const eligibleDocs = eligibleSnapshot.docs.filter((doc) => isEligibleRunClubSubmission(doc.data()));
    if (eligibleDocs.length === 0) return Response.json({ ok: false, code: "no_approved_participants", message: "No eligible approved participants for this month." }, { status: 409 });
    const winnerCount = normalizeWinnerCount(parsed.data?.winnerCount, eligibleDocs.length);
    const selectedDocs = selectSecureWinnerIndexes(eligibleDocs.length, winnerCount).map((index) => eligibleDocs[index]);
    const result = await db.runTransaction(async (transaction) => {
      const monthRef = db.collection("runClubMonths").doc(monthKey);
      const monthSnap = await transaction.get(monthRef);
      const existingWinnerIds = getWinnerSubmissionIds(monthSnap.exists ? monthSnap.data() : undefined);
      if (existingWinnerIds.length) {
        const winnerSnaps = await Promise.all(existingWinnerIds.map((id) => transaction.get(db.collection("runClubSubmissions").doc(id))));
        const winners = winnerSnaps.map((winnerSnap, index) => winnerSnap.exists ? serializePublicWinner(winnerSnap.id, winnerSnap.data() ?? {}, monthKey, monthSnap.get("winnerSelectedAt"), index + 1) : null).filter((winner) => winner !== null);
        if (winners.length === 0) throw new Error("MISSING_WINNER_SUBMISSION");
        return { alreadyDrawn: true, eligibleCount: Number(monthSnap.get("eligibleCountAtDraw") ?? eligibleDocs.length), winners };
      }
      const chosenRefs = selectedDocs.map((doc) => db.collection("runClubSubmissions").doc(doc.id));
      const chosenSnaps = await Promise.all(chosenRefs.map((ref) => transaction.get(ref)));
      if (chosenSnaps.some((snap) => !snap.exists || !isEligibleRunClubSubmission(snap.data() ?? {}) || snap.get("monthKey") !== monthKey)) throw new Error("CHOSEN_INELIGIBLE");
      const storedApprovedCount = Number(monthSnap.get("approvedCount") ?? 0);
      if (storedApprovedCount !== eligibleDocs.length) console.warn("[run-club-draw] approved count mismatch", { monthKey, storedApprovedCount, actualEligibleCount: eligibleDocs.length });
      const winnerSubmissionIds = chosenSnaps.map((snap) => snap.id);
      transaction.set(monthRef, { monthKey, drawStatus: "drawn", winnerSubmissionId: winnerSubmissionIds[0], winnerSubmissionIds, winnerCount: winnerSubmissionIds.length, winnerSelectedAt: FieldValue.serverTimestamp(), winnerSelectedBy: admin.email, eligibleCountAtDraw: eligibleDocs.length, drawVersion: RUN_CLUB_DRAW_VERSION, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      chosenRefs.forEach((chosenRef, index) => transaction.update(chosenRef, { isWinner: true, winnerMonthKey: monthKey, winnerPlacement: index + 1, winnerSelectedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }));
      const winners = chosenSnaps.map((snap, index) => serializePublicWinner(snap.id, snap.data() ?? {}, monthKey, new Date(), index + 1)).filter((winner) => winner !== null);
      if (winners.length === 0) throw new Error("CHOSEN_INELIGIBLE");
      return { alreadyDrawn: false, eligibleCount: eligibleDocs.length, winners };
    });
    revalidateTag("run-club", "max"); revalidatePath("/"); revalidatePath("/run-club");
    return Response.json({ ok: true, code: result.alreadyDrawn ? "already_drawn" : "winners_drawn", message: result.alreadyDrawn ? "Winner draw already completed." : "Winner draw completed and saved.", monthKey, eligibleCount: result.eligibleCount, winners: result.winners, winner: result.winners[0] ?? null });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_WINNER_SUBMISSION") return Response.json({ ok: false, code: "missing_winner_submission", message: "The saved winner submissions could not be loaded." }, { status: 409 });
    console.error("[run-club-draw] draw failed");
    return Response.json({ ok: false, code: "draw_failed", message: "Winner draw could not be completed." }, { status: 500 });
  }
}
