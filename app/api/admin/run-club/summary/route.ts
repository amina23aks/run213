import { z } from "zod";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getRunClubDrawStatus, getWinnerSubmissionIds, isEligibleRunClubSubmission, serializePublicWinner } from "@/lib/run-club/draw";
import { getAlgiersMonthKey } from "@/lib/run-club/security";
import { RUN_CLUB_MAX_APPROVED } from "@/lib/run-club/types";

export const dynamic = "force-dynamic";
const querySchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() });
export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request); if (!admin) return adminJsonError("Unauthorized", 401);
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams)); if (!parsed.success) return Response.json({ ok: false, code: "validation_failed", message: "Invalid month." }, { status: 400 });
  const monthKey = parsed.data.month ?? getAlgiersMonthKey();
  const db = getAdminDb();
  const [pending, approved, rejected, monthDoc, eligibleSnapshot] = await Promise.all([
    db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "pending").count().get(),
    db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "approved").count().get(),
    db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "rejected").count().get(),
    db.collection("runClubMonths").doc(monthKey).get(),
    db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "approved").get(),
  ]);
  const monthData = monthDoc.exists ? monthDoc.data() ?? {} : {};
  const storedApprovedCount = Number(monthDoc.get("approvedCount") ?? approved.data().count ?? 0);
  const eligibleDocs = eligibleSnapshot.docs.filter((doc) => isEligibleRunClubSubmission(doc.data()));
  const winnerSubmissionIds = getWinnerSubmissionIds(monthData);
  const winnerDocs = await Promise.all(winnerSubmissionIds.map((id) => db.collection("runClubSubmissions").doc(id).get()));
  const selectionDates = new Map<string, unknown>();
  if (Array.isArray(monthData.winnerSelections)) monthData.winnerSelections.forEach((selection) => { if (selection && typeof selection.submissionId === "string") selectionDates.set(selection.submissionId, selection.selectedAt); });
  const winners = winnerDocs.map((winnerDoc, index) => winnerDoc.exists ? serializePublicWinner(winnerDoc.id, winnerDoc.data() ?? {}, monthKey, winnerDoc.get("winnerSelectedAt") ?? selectionDates.get(winnerDoc.id) ?? monthData.winnerSelectedAt, index + 1) : null).filter((winner) => winner !== null);
  const winner = winners[0] ?? null;
  const remainingEligibleCount = eligibleDocs.filter((doc) => !winnerSubmissionIds.includes(doc.id)).length;
  const eligibleCountAtDraw = typeof monthData.eligibleCountAtDraw === "number" ? monthData.eligibleCountAtDraw : null;
  return Response.json({ ok: true, monthKey, pendingCount: pending.data().count, approvedCount: approved.data().count, rejectedCount: rejected.data().count, monthlyApprovedCount: storedApprovedCount, maximumApproved: RUN_CLUB_MAX_APPROVED, remaining: Math.max(RUN_CLUB_MAX_APPROVED - storedApprovedCount, 0), status: storedApprovedCount >= RUN_CLUB_MAX_APPROVED ? "full" : "open", eligibleDrawCount: eligibleDocs.length, currentApprovedCount: eligibleDocs.length, remainingEligibleCount, hasAdditionalEligibleParticipants: winnerSubmissionIds.length < 3 && remainingEligibleCount > 0, approvedAddedAfterDrawCount: eligibleCountAtDraw == null ? 0 : Math.max(eligibleDocs.length - eligibleCountAtDraw, 0), drawStatus: getRunClubDrawStatus(monthData), winner, winners, winnerSubmissionId: winnerSubmissionIds[0] ?? null, winnerSubmissionIds, winnerCount: winners.length || Number(monthData.winnerCount ?? 0), eligibleCountAtDraw, winnerSelectedAt: winner?.winnerSelectedAt ?? null, approvedCountMismatch: storedApprovedCount !== eligibleDocs.length });
}
