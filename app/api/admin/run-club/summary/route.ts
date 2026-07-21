import { z } from "zod";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAlgiersMonthKey } from "@/lib/run-club/security";
import { RUN_CLUB_MAX_APPROVED } from "@/lib/run-club/types";

export const dynamic = "force-dynamic";
const querySchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() });
export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request); if (!admin) return adminJsonError("Unauthorized", 401);
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams)); if (!parsed.success) return Response.json({ ok: false, code: "validation_failed", message: "Invalid month." }, { status: 400 });
  const monthKey = parsed.data.month ?? getAlgiersMonthKey();
  const db = getAdminDb();
  const [pending, approved, rejected, monthDoc] = await Promise.all([
    db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "pending").count().get(),
    db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "approved").count().get(),
    db.collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", "rejected").count().get(),
    db.collection("runClubMonths").doc(monthKey).get(),
  ]);
  const approvedCount = Number(monthDoc.get("approvedCount") ?? approved.data().count ?? 0);
  return Response.json({ ok: true, monthKey, pendingCount: pending.data().count, approvedCount: approved.data().count, rejectedCount: rejected.data().count, monthlyApprovedCount: approvedCount, maximumApproved: RUN_CLUB_MAX_APPROVED, remaining: Math.max(RUN_CLUB_MAX_APPROVED - approvedCount, 0), status: approvedCount >= RUN_CLUB_MAX_APPROVED ? "full" : "open" });
}
