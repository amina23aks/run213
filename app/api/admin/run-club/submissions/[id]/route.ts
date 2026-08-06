import { revalidatePath, revalidateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { RUN_CLUB_MAX_APPROVED } from "@/lib/run-club/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const approveSchema = z.object({ action: z.literal("approve"), publicName: z.string().trim().min(2).max(80), publicCaption: z.string().trim().max(280).nullable().optional(), publicWilaya: z.string().trim().max(60).nullable().optional() }).strict();
const rejectSchema = z.object({ action: z.literal("reject"), rejectionReason: z.string().trim().max(240).nullable().optional() }).strict();
const requestSchema=z.object({action:z.enum(["approve_edit","reject_edit","approve_removal","reject_removal"])}).strict();
const bodySchema = z.union([approveSchema, rejectSchema,requestSchema]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdminRequest(request); if (!admin) return adminJsonError("Unauthorized", 401);
  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, code: "validation_failed", message: "Invalid moderation action." }, { status: 400 });
  const db = getAdminDb(); const ref = db.collection("runClubSubmissions").doc(id);
  try {
    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref); if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data() ?? {}; const monthKey = String(data.monthKey); const monthRef = db.collection("runClubMonths").doc(monthKey); const monthSnap = await transaction.get(monthRef);
      const currentCount = Math.max(0, Number(monthSnap.get("approvedCount") ?? 0)); const wasApproved = data.status === "approved";
      if(parsed.data.action==="approve_edit"||parsed.data.action==="reject_edit"){
        if(data.moderationState!=="edit_requested")throw new Error("INVALID_REQUEST");
        const revision=data.pendingRevision??{};
        transaction.update(ref,parsed.data.action==="approve_edit"?{name:revision.publicName??data.name,publicName:revision.publicName??data.publicName??data.name,caption:revision.caption??null,wilaya:revision.wilaya??null,publicCaption:revision.caption??null,publicWilaya:revision.wilaya??null,moderationState:FieldValue.delete(),pendingRevision:FieldValue.delete(),editReviewedAt:FieldValue.serverTimestamp(),editReviewedBy:admin.email,updatedAt:FieldValue.serverTimestamp(),moderationHistory:FieldValue.arrayUnion({action:"edit_approved",at:new Date().toISOString(),by:admin.email})}:{moderationState:FieldValue.delete(),pendingRevision:FieldValue.delete(),editReviewedAt:FieldValue.serverTimestamp(),editReviewedBy:admin.email,updatedAt:FieldValue.serverTimestamp(),moderationHistory:FieldValue.arrayUnion({action:"edit_rejected",at:new Date().toISOString(),by:admin.email})});
        return{status:"approved",approvedCount:currentCount,idempotent:false};
      }
      if(parsed.data.action==="approve_removal"||parsed.data.action==="reject_removal"){
        if(data.moderationState!=="removal_requested")throw new Error("INVALID_REQUEST");
        const approved=parsed.data.action==="approve_removal";const nextCount=approved?Math.max(currentCount-1,0):currentCount;
        if(approved)transaction.set(monthRef,{monthKey,approvedCount:nextCount,maximumApproved:RUN_CLUB_MAX_APPROVED,status:nextCount>=RUN_CLUB_MAX_APPROVED?"full":"open",updatedAt:FieldValue.serverTimestamp()},{merge:true});
        transaction.update(ref,approved?{status:"removed",moderationState:"removed",publicVisible:false,removedAt:FieldValue.serverTimestamp(),removedBy:admin.email,updatedAt:FieldValue.serverTimestamp(),moderationHistory:FieldValue.arrayUnion({action:"removal_approved",at:new Date().toISOString(),by:admin.email})}:{moderationState:FieldValue.delete(),publicVisible:true,removalReviewedAt:FieldValue.serverTimestamp(),removalReviewedBy:admin.email,updatedAt:FieldValue.serverTimestamp(),moderationHistory:FieldValue.arrayUnion({action:"removal_rejected",at:new Date().toISOString(),by:admin.email})});
        return{status:approved?"removed":"approved",approvedCount:nextCount,idempotent:false};
      }
      if (parsed.data.action === "approve") {
        if (wasApproved) return { status: "approved", approvedCount: currentCount, idempotent: true };
        if (currentCount >= RUN_CLUB_MAX_APPROVED) throw new Error("MONTH_FULL");
        const nextCount = currentCount + 1;
        transaction.set(monthRef, { monthKey, approvedCount: nextCount, maximumApproved: RUN_CLUB_MAX_APPROVED, status: nextCount >= RUN_CLUB_MAX_APPROVED ? "full" : "open", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        transaction.update(ref, { status: "approved", publicVisible:true, publicName: parsed.data.publicName, publicCaption: parsed.data.publicCaption ?? null, publicWilaya: parsed.data.publicWilaya ?? null, approvedAt: FieldValue.serverTimestamp(), approvedBy: admin.email, rejectedAt: FieldValue.delete(), rejectedBy: FieldValue.delete(), rejectionReason: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
        return { status: "approved", approvedCount: nextCount, idempotent: false };
      }
      if (data.status === "rejected") return { status: "rejected", approvedCount: currentCount, idempotent: true };
      const nextCount = wasApproved ? Math.max(currentCount - 1, 0) : currentCount;
      transaction.set(monthRef, { monthKey, approvedCount: nextCount, maximumApproved: RUN_CLUB_MAX_APPROVED, status: nextCount >= RUN_CLUB_MAX_APPROVED ? "full" : "open", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      const rejectionReason = parsed.data.action === "reject" ? parsed.data.rejectionReason ?? null : null;
      transaction.update(ref, { status: "rejected", rejectedAt: FieldValue.serverTimestamp(), rejectedBy: admin.email, rejectionReason, updatedAt: FieldValue.serverTimestamp() });
      return { status: "rejected", approvedCount: nextCount, idempotent: false };
    });
    revalidateTag("run-club", "max"); revalidatePath("/"); revalidatePath("/run-club");
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return Response.json({ ok: false, code: "not_found", message: "Submission not found." }, { status: 404 });
    if (error instanceof Error && error.message === "MONTH_FULL") return Response.json({ ok: false, code: "month_full", message: "This month already has 26 approved participants." }, { status: 409 });
    if (error instanceof Error && error.message === "INVALID_REQUEST") return Response.json({ ok: false, code: "invalid_request", message: "This request is no longer pending." }, { status: 409 });
    console.error("[admin-run-club] moderation failed"); return Response.json({ ok: false, code: "moderation_failed", message: "Submission could not be updated." }, { status: 500 });
  }
}
