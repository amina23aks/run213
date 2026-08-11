import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const linkSchema = z.object({ uid: z.string().trim().min(1).max(128), confirm: z.boolean().default(false) }).strict();

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminVerification = await verifyAdminRequest(request);

  if (!adminVerification.ok) return adminVerification.response;

  const admin = adminVerification.admin;
  const parsed = linkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: "Enter an exact Firebase Authentication UID." }, { status: 400 });
  const { id } = await context.params;
  let target;
  try { target = await getAdminAuth().getUser(parsed.data.uid); }
  catch { return Response.json({ ok: false, message: "No Firebase Authentication user exists with that UID." }, { status: 404 }); }
  if (!parsed.data.confirm) return Response.json({ ok: true, uid: target.uid, email: target.email ?? null });
  const db = getAdminDb(), ref = db.collection("runClubSubmissions").doc(id);
  try {
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("NOT_FOUND");
      const owner = snapshot.get("customerUserId");
      if (typeof owner === "string" && owner.length > 0) throw new Error(owner === target.uid ? "ALREADY_LINKED" : "DIFFERENT_OWNER");
      transaction.update(ref, { customerUserId: target.uid, linkedToCustomerAt: FieldValue.serverTimestamp(), linkedToCustomerBy: admin.uid });
    });
    return Response.json({ ok: true, uid: target.uid, email: target.email ?? null });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return Response.json({ ok: false, message: "Submission not found." }, { status: 404 });
    if (error instanceof Error && error.message === "ALREADY_LINKED") return Response.json({ ok: false, message: "This submission is already linked to that customer." }, { status: 409 });
    if (error instanceof Error && error.message === "DIFFERENT_OWNER") return Response.json({ ok: false, message: "This submission already belongs to another customer and cannot be overwritten." }, { status: 409 });
    return Response.json({ ok: false, message: "Customer account could not be linked." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminVerification = await verifyAdminRequest(request);

  if (!adminVerification.ok) return adminVerification.response;

  const admin = adminVerification.admin;
  const { id } = await context.params;
  const db = getAdminDb(), ref = db.collection("runClubSubmissions").doc(id);
  try {
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("NOT_FOUND");
      const owner = snapshot.get("customerUserId");
      if (typeof owner !== "string" || !owner) throw new Error("NOT_LINKED");
      transaction.update(ref, { customerUserId: null, unlinkedFromCustomerAt: FieldValue.serverTimestamp(), unlinkedFromCustomerBy: admin.uid });
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return Response.json({ ok: false, message: "Submission not found." }, { status: 404 });
    if (error instanceof Error && error.message === "NOT_LINKED") return Response.json({ ok: false, message: "This submission is not linked to a customer." }, { status: 409 });
    return Response.json({ ok: false, message: "Customer account could not be unlinked." }, { status: 500 });
  }
}
