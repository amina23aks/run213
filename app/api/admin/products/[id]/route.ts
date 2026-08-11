import { revalidatePath, revalidateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { adminProductInputSchema, withCanonicalStock } from "@/lib/products/schema";

export const dynamic = "force-dynamic";
const COLLECTION = "products";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);

  const { id } = await params;
  const snapshot = await getAdminDb().collection(COLLECTION).doc(id).get();
  if (!snapshot.exists) return adminJsonError("Product not found", 404);
  return Response.json({ product: { id: snapshot.id, ...snapshot.data() } });
}

export async function PUT(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);

  const { id } = await params;
  const parsed = adminProductInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid product input", issues: parsed.error.flatten() }, { status: 400 });

  const docRef = getAdminDb().collection(COLLECTION).doc(id);
  const current = await docRef.get();
  if (!current.exists) return adminJsonError("Product not found", 404);

  const slugSnapshot = await getAdminDb().collection(COLLECTION).where("slug", "==", parsed.data.slug).limit(2).get();
  const duplicate = slugSnapshot.docs.find((doc) => doc.id !== id);
  if (duplicate) return adminJsonError("A product with this slug already exists.", 409);

  const previousSlug = current.get("slug");
  const product = withCanonicalStock(parsed.data);
  await docRef.update({ ...product, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  revalidateProductStorefront(parsed.data.slug, typeof previousSlug === "string" ? previousSlug : undefined);
  return Response.json({ id });
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);

  const { id } = await params;
  const docRef = getAdminDb().collection(COLLECTION).doc(id);
  const current = await docRef.get();
  await docRef.update({ status: "archived", updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  const slug = current.get("slug");
  revalidateProductStorefront(typeof slug === "string" ? slug : undefined);
  return Response.json({ id, status: "archived" });
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { id } = await params;
  const docRef = getAdminDb().collection(COLLECTION).doc(id);
  const current = await docRef.get();
  if (!current.exists) return adminJsonError("Product not found", 404);
  if (current.get("status") !== "archived") return adminJsonError("Only archived products can be restored", 409);
  await docRef.update({ status: "draft", updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  const slug = current.get("slug");
  revalidateProductStorefront(typeof slug === "string" ? slug : undefined);
  return Response.json({ id, status: "draft" });
}

function revalidateProductStorefront(slug?: string, previousSlug?: string) {
  revalidateTag("products", "max");
  revalidatePath("/");
  revalidatePath("/shop");
  if (slug) revalidatePath(`/product/${slug}`);
  if (previousSlug && previousSlug !== slug) revalidatePath(`/product/${previousSlug}`);
}
