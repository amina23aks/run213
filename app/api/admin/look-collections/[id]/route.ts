import { revalidatePath, revalidateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { lookCollectionInputSchema } from "@/lib/look-schema";

export const dynamic = "force-dynamic";
const COLLECTION = "lookCollections";
type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { id } = await params;
  const parsed = lookCollectionInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid collection input", issues: parsed.error.flatten() }, { status: 400 });
  const docRef = getAdminDb().collection(COLLECTION).doc(id);
  const current = await docRef.get();
  if (!current.exists) return adminJsonError("Collection not found", 404);
  const duplicateSnapshot = await getAdminDb().collection(COLLECTION).where("slug", "==", parsed.data.slug).limit(2).get();
  if (duplicateSnapshot.docs.some((doc) => doc.id !== id)) return adminJsonError("A collection with this slug already exists.", 409);
  await docRef.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  revalidateLooks(parsed.data.slug, current.get("slug"));
  return Response.json({ id });
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { id } = await params;
  const docRef = getAdminDb().collection(COLLECTION).doc(id);
  const current = await docRef.get();
  if (!current.exists) return adminJsonError("Collection not found", 404);
  await docRef.update({ status: "archived", updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  revalidateLooks(current.get("slug"));
  return Response.json({ id, status: "archived" });
}

function revalidateLooks(slug?: unknown, previousSlug?: unknown) {
  revalidateTag("looks", "max");
  revalidatePath("/");
  revalidatePath("/looks/[collectionSlug]", "page");
  revalidatePath("/admin/look-collections");
  revalidatePath("/admin/looks");
  if (typeof slug === "string") revalidatePath(`/looks/${slug}`);
  if (typeof previousSlug === "string" && previousSlug !== slug) revalidatePath(`/looks/${previousSlug}`);
}
