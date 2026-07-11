import { revalidatePath, revalidateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { lookInputSchema } from "@/lib/look-schema";

export const dynamic = "force-dynamic";
const COLLECTION = "looks";
type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { id } = await params;
  const parsed = lookInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid look input", issues: parsed.error.flatten() }, { status: 400 });
  const docRef = getAdminDb().collection(COLLECTION).doc(id);
  const current = await docRef.get();
  if (!current.exists) return adminJsonError("Look not found", 404);
  const duplicateSnapshot = await getAdminDb().collection(COLLECTION).where("slug", "==", parsed.data.slug).limit(2).get();
  if (duplicateSnapshot.docs.some((doc) => doc.id !== id)) return adminJsonError("A look with this slug already exists.", 409);
  await docRef.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  revalidateLooks(parsed.data.slug, current.get("slug"), parsed.data.collectionSlug, current.get("collectionSlug"));
  return Response.json({ id });
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { id } = await params;
  const docRef = getAdminDb().collection(COLLECTION).doc(id);
  const current = await docRef.get();
  if (!current.exists) return adminJsonError("Look not found", 404);
  await docRef.update({ status: "archived", updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  revalidateLooks(current.get("slug"), undefined, current.get("collectionSlug"));
  return Response.json({ id, status: "archived" });
}

function revalidateLooks(slug?: unknown, previousSlug?: unknown, collectionSlug?: unknown, previousCollectionSlug?: unknown) {
  revalidateTag("looks", "max");
  revalidatePath("/");
  revalidatePath("/look/[lookSlug]", "page");
  revalidatePath("/looks/[collectionSlug]", "page");
  if (typeof slug === "string") revalidatePath(`/look/${slug}`);
  if (typeof previousSlug === "string" && previousSlug !== slug) revalidatePath(`/look/${previousSlug}`);
  if (typeof collectionSlug === "string") revalidatePath(`/looks/${collectionSlug}`);
  if (typeof previousCollectionSlug === "string" && previousCollectionSlug !== collectionSlug) revalidatePath(`/looks/${previousCollectionSlug}`);
}
