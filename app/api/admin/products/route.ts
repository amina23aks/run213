import { FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { adminProductInputSchema } from "@/lib/products/schema";

export const dynamic = "force-dynamic";
const COLLECTION = "products";
const LIMIT = 50;

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);

  const snapshot = await getAdminDb().collection(COLLECTION).orderBy("sortOrder", "asc").limit(LIMIT).get();
  const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return Response.json({ products });
}

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);

  const parsed = adminProductInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid product input", issues: parsed.error.flatten() }, { status: 400 });

  const slugSnapshot = await getAdminDb().collection(COLLECTION).where("slug", "==", parsed.data.slug).limit(1).get();
  if (!slugSnapshot.empty) return adminJsonError("A product with this slug already exists.", 409);

  const docRef = getAdminDb().collection(COLLECTION).doc();
  const now = FieldValue.serverTimestamp();
  await docRef.set({ ...parsed.data, createdAt: now, updatedAt: now, updatedBy: admin.email });

  return Response.json({ id: docRef.id }, { status: 201 });
}
