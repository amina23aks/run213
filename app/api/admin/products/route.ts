import { revalidatePath, revalidateTag } from "next/cache";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { adminProductInputSchema } from "@/lib/products/schema";

export const dynamic = "force-dynamic";
const COLLECTION = "products";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

type AdminProductCursor = {
  sortOrder: number;
  id: string;
};

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const pageSize = clampLimit(requestedLimit);
  const cursor = parseCursor(url.searchParams.get("cursor"));
  let productsQuery = getAdminDb()
    .collection(COLLECTION)
    .orderBy("sortOrder", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(pageSize + 1);

  if (cursor) {
    productsQuery = productsQuery.startAfter(cursor.sortOrder, cursor.id);
  }

  const snapshot = await productsQuery.get();
  const docs = snapshot.docs.slice(0, pageSize);
  const products = docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const lastDoc = docs.at(-1);
  const hasMore = snapshot.docs.length > pageSize;
  const lastSortOrder = lastDoc?.get("sortOrder");
  const nextCursor = hasMore && lastDoc && typeof lastSortOrder === "number"
    ? encodeCursor({ id: lastDoc.id, sortOrder: lastSortOrder })
    : null;

  return Response.json({ products, nextCursor });
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
  revalidateProductStorefront(parsed.data.slug);

  return Response.json({ id: docRef.id }, { status: 201 });
}

function clampLimit(requestedLimit: number): number {
  if (!Number.isFinite(requestedLimit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_LIMIT);
}

function encodeCursor(cursor: AdminProductCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function parseCursor(value: string | null): AdminProductCursor | null {
  if (!value) return null;

  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<AdminProductCursor>;
    if (typeof decoded.sortOrder === "number" && typeof decoded.id === "string") {
      return { sortOrder: decoded.sortOrder, id: decoded.id };
    }
  } catch {
    return null;
  }

  return null;
}

function revalidateProductStorefront(slug?: string) {
  revalidateTag("products", "max");
  revalidatePath("/");
  revalidatePath("/shop");
  if (slug) revalidatePath(`/product/${slug}`);
}
