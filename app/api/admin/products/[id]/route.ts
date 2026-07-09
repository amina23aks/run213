import { FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { adminProductInputSchema } from "@/lib/products/schema";

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

  await docRef.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  return Response.json({ id });
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);

  const { id } = await params;
  await getAdminDb().collection(COLLECTION).doc(id).update({ status: "archived", updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  return Response.json({ id, status: "archived" });
}
