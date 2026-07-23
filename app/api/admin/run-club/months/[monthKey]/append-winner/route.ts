import { randomInt } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getWinnerSubmissionIds, isEligibleRunClubSubmission, isValidMonthKey, RUN_CLUB_DRAW_VERSION, serializePublicWinner } from "@/lib/run-club/draw";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ monthKey: string }> }) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { monthKey } = await context.params;
  if (!isValidMonthKey(monthKey)) return Response.json({ ok: false, code: "invalid_month", message: "Invalid month." }, { status: 400 });

  const db = getAdminDb();
  try {
    const result = await db.runTransaction(async (transaction) => {
      const monthRef = db.collection("runClubMonths").doc(monthKey);
      const monthSnap = await transaction.get(monthRef);
      const monthData = monthSnap.exists ? monthSnap.data() ?? {} : {};
      const existingWinnerIds = getWinnerSubmissionIds(monthData);
      if (!existingWinnerIds.length || monthData.drawStatus !== "drawn") throw new Error("MONTH_NOT_DRAWN");
      if (existingWinnerIds.length >= 3) throw new Error("MAX_WINNERS_SAVED");

      const eligibleSnapshot = await transaction.get(db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "approved"));
      const existingSet = new Set(existingWinnerIds);
      const candidates = eligibleSnapshot.docs.filter((doc) => isEligibleRunClubSubmission(doc.data()) && !existingSet.has(doc.id));
      if (!candidates.length) throw new Error("NO_ADDITIONAL_CANDIDATES");

      const selectedDoc = candidates[randomInt(candidates.length)];
      const selectedRef = db.collection("runClubSubmissions").doc(selectedDoc.id);
      const selectedSnap = await transaction.get(selectedRef);
      if (!selectedSnap.exists || !isEligibleRunClubSubmission(selectedSnap.data() ?? {}) || selectedSnap.get("monthKey") !== monthKey || existingSet.has(selectedSnap.id)) throw new Error("CHOSEN_INELIGIBLE");

      const appendedWinnerIds = [...existingWinnerIds, selectedSnap.id];
      const placement = appendedWinnerIds.length;
      const selectedAt = Timestamp.now();
      const selectedBy = admin.email || admin.uid;
      const existingSelections = Array.isArray(monthData.winnerSelections) ? monthData.winnerSelections : [];
      transaction.set(monthRef, {
        monthKey,
        drawStatus: "drawn",
        winnerSubmissionId: appendedWinnerIds[0],
        winnerSubmissionIds: appendedWinnerIds,
        winnerCount: appendedWinnerIds.length,
        winnerSelections: [...existingSelections, { submissionId: selectedSnap.id, placement, selectedAt, selectedBy, eligibleCountAtSelection: candidates.length }],
        drawVersion: RUN_CLUB_DRAW_VERSION,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.update(selectedRef, { isWinner: true, winnerMonthKey: monthKey, winnerPlacement: placement, winnerSelectedAt: selectedAt, updatedAt: FieldValue.serverTimestamp() });

      const winner = serializePublicWinner(selectedSnap.id, selectedSnap.data() ?? {}, monthKey, selectedAt, placement);
      if (!winner) throw new Error("CHOSEN_INELIGIBLE");
      return { winner, winnerSubmissionIds: appendedWinnerIds, eligibleCount: candidates.length };
    });
    revalidateTag("run-club", "max"); revalidatePath("/"); revalidatePath("/run-club");
    return Response.json({ ok: true, code: "winner_appended", message: "Additional winner selected and saved.", monthKey, winner: result.winner, winnerSubmissionIds: result.winnerSubmissionIds, winnerCount: result.winnerSubmissionIds.length, eligibleCount: result.eligibleCount });
  } catch (error) {
    if (error instanceof Error && error.message === "MONTH_NOT_DRAWN") return Response.json({ ok: false, code: "month_not_drawn", message: "Draw the month before adding another winner." }, { status: 409 });
    if (error instanceof Error && error.message === "MAX_WINNERS_SAVED") return Response.json({ ok: false, code: "maximum_winners_reached", message: "Maximum 3 winners saved." }, { status: 409 });
    if (error instanceof Error && error.message === "NO_ADDITIONAL_CANDIDATES") return Response.json({ ok: false, code: "no_additional_candidates", message: "No additional eligible participants remain." }, { status: 409 });
    if (error instanceof Error && error.message === "CHOSEN_INELIGIBLE") return Response.json({ ok: false, code: "candidate_changed", message: "The selected participant changed before the winner could be saved. Try again." }, { status: 409 });
    const code = error instanceof Error && /index/i.test(error.message) ? "missing_index" : "transaction_failed";
    console.error("[run-club-append-winner] append failed", error);
    return Response.json({ ok: false, code, message: code === "missing_index" ? "A Firestore index is missing for this action." : "Additional winner could not be selected. Try again." }, { status: 500 });
  }
}
