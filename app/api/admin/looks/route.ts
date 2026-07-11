import { revalidatePath, revalidateTag } from "next/cache";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { lookInputSchema } from "@/lib/look-schema";

export const dynamic = "force-dynamic";
const COLLECTION = "looks";
const DEFAULT_LIMIT = 50;

type Cursor = { sortOrder: number; id: string };

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const url = new URL(request.url);
  const cursor = parseCursor(url.searchParams.get("cursor"));
  let query = getAdminDb().collection(COLLECTION).orderBy("sortOrder", "asc").orderBy(FieldPath.documentId(), "asc").limit(DEFAULT_LIMIT + 1);
  if (cursor) query = query.startAfter(cursor.sortOrder, cursor.id);
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, DEFAULT_LIMIT);
  const lastDoc = docs.at(-1);
  const hasMore = snapshot.docs.length > DEFAULT_LIMIT;
  const lastSortOrder = lastDoc?.get("sortOrder");
  return Response.json({
    items: docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    nextCursor: hasMore && lastDoc && typeof lastSortOrder === "number" ? encodeCursor({ sortOrder: lastSortOrder, id: lastDoc.id }) : null,
  });
}

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const parsed = lookInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid look input", issues: parsed.error.flatten() }, { status: 400 });
  const slugSnapshot = await getAdminDb().collection(COLLECTION).where("slug", "==", parsed.data.slug).limit(1).get();
  if (!slugSnapshot.empty) return adminJsonError("An entry with this slug already exists.", 409);
  const docRef = getAdminDb().collection(COLLECTION).doc();
  const now = FieldValue.serverTimestamp();
  await docRef.set({ ...parsed.data, createdAt: now, updatedAt: now, updatedBy: admin.email });
  revalidateLooks();
  return Response.json({ id: docRef.id }, { status: 201 });
}

function encodeCursor(cursor: Cursor): string { return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url"); }
function parseCursor(value: string | null): Cursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<Cursor>;
    if (typeof decoded.sortOrder === "number" && typeof decoded.id === "string") return { sortOrder: decoded.sortOrder, id: decoded.id };
  } catch (error) { console.warn("[admin-looks] Invalid cursor", error); }
  return null;
}
function revalidateLooks() { revalidateTag("looks", "max"); revalidatePath("/"); revalidatePath("/looks/[collectionSlug]", "page"); revalidatePath("/look/[lookSlug]", "page"); }
