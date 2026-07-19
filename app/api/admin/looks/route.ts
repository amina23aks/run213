import { revalidatePath, revalidateTag } from "next/cache";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { lookInputSchema, type LookInput } from "@/lib/look-schema";
import { calculateLookPricing } from "@/lib/looks/pricing";
import type { Product } from "@/types/product";

export const dynamic = "force-dynamic";
const COLLECTION = "looks";
const PRODUCTS_COLLECTION = "products";
const COLLECTIONS_COLLECTION = "lookCollections";
const DEFAULT_LIMIT = 50;

type Cursor = { sortOrder: number; id: string };
type SafeErrorCode = "validation_failed" | "duplicate_slug" | "collection_missing" | "products_unavailable" | "index_required" | "write_failed";

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
  if (!parsed.success) return safeLookError("validation_failed", "Check the Look fields and try again.", 400, parsed.error.flatten().fieldErrors);

  try {
    const slugSnapshot = await getAdminDb().collection(COLLECTION).where("slug", "==", parsed.data.slug).limit(1).get();
    if (!slugSnapshot.empty) return safeLookError("duplicate_slug", "A Look with this slug already exists.", 409);
    const canonical = await canonicalizeLookInput(parsed.data);
    if ("response" in canonical) return canonical.response;
    const docRef = getAdminDb().collection(COLLECTION).doc();
    const now = FieldValue.serverTimestamp();
    const sortOrder = parsed.data.sortOrder ?? await getNextLookSortOrder(parsed.data.collectionId);
    const homepageFigureOrder = parsed.data.showAsHomepageFigure ? parsed.data.homepageFigureOrder ?? await getNextHomepageFigureOrder() : null;
    await docRef.set({ ...canonical.data, sortOrder, homepageFigureOrder, createdAt: now, updatedAt: now, updatedBy: admin.email });
    revalidateLooks();
    return Response.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    return handleLookServerError(error);
  }
}

async function canonicalizeLookInput(input: LookInput): Promise<{ data: LookInput } | { response: Response }> {
  const collection = await getAdminDb().collection(COLLECTIONS_COLLECTION).doc(input.collectionId).get();
  if (!collection.exists || collection.get("status") === "archived") return { response: safeLookError("collection_missing", "Selected Collection no longer exists.", 400) };
  const products = await readCanonicalProducts(input.productIds);
  if (products.unavailable.length) return { response: safeLookError("products_unavailable", `One or more selected Products are unavailable: ${products.unavailable.join(", ")}.`, 400, { productIds: ["One or more selected Products are unavailable."] }) };
  const requestedDiscount = input.discountPercent ?? 0;
  const mode = requestedDiscount > 0 || input.isPromo ? "sale" : "regular";
  const pricing = calculateLookPricing({ mode, enteredPriceDzd: input.priceDzd, discountPercent: requestedDiscount, products: products.items });
  if (pricing.sumProductSellingPrices <= 0) return { response: safeLookError("validation_failed", "Selected Products must have a selling total greater than zero.", 400, { productIds: ["Selected Products must have a selling total greater than zero."] }) };
  if (mode === "sale" && (requestedDiscount <= 0 || requestedDiscount >= 100)) return { response: safeLookError("validation_failed", "Discount must be greater than 0 and less than 100.", 400, { discountPercent: ["Discount must be greater than 0 and less than 100."] }) };
  if (pricing.lookSellingPrice <= 0) return { response: safeLookError("validation_failed", "Look price must be greater than zero.", 400, { priceDzd: ["Look price must be greater than zero."] }) };
  return { data: { ...input, priceDzd: pricing.lookSellingPrice, compareAtPriceDzd: pricing.compareAtPriceDzd, discountPercent: pricing.discountPercent, isPromo: pricing.isPromo, costPriceDzd: pricing.totalLookCost } };
}

async function readCanonicalProducts(productIds: string[]): Promise<{ items: Product[]; unavailable: string[] }> {
  const uniqueIds = Array.from(new Set(productIds));
  const results = await Promise.all(uniqueIds.map(async (id) => {
    const doc = await getAdminDb().collection(PRODUCTS_COLLECTION).doc(id).get();
    const data = doc.data() as Partial<Product> | undefined;
    if (!doc.exists || !data || data.status !== "active" || typeof data.priceDzd !== "number") return { product: null, label: typeof data?.name === "string" ? data.name : id };
    return { product: { id: doc.id, ...data } as Product, label: data.name ?? id };
  }));
  return { items: results.flatMap((item) => item.product ? [item.product] : []), unavailable: results.flatMap((item) => item.product ? [] : [item.label]) };
}

function safeLookError(code: SafeErrorCode, message: string, status: number, fieldErrors?: Record<string, string[] | undefined>) {
  return Response.json({ code, message, fieldErrors }, { status });
}
function handleLookServerError(error: unknown) {
  console.error("[admin-looks] Save failed", error);
  const text = error instanceof Error ? error.message : "";
  if (text.includes("FAILED_PRECONDITION") && text.toLowerCase().includes("index")) return safeLookError("index_required", "A Firestore index is required for automatic Look ordering.", 500);
  return safeLookError("write_failed", "Look could not be saved. Please try again.", 500);
}
function encodeCursor(cursor: Cursor): string { return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url"); }
function parseCursor(value: string | null): Cursor | null { if (!value) return null; try { const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<Cursor>; if (typeof decoded.sortOrder === "number" && typeof decoded.id === "string") return { sortOrder: decoded.sortOrder, id: decoded.id }; } catch (error) { console.warn("[admin-looks] Invalid cursor", error); } return null; }
function revalidateLooks() { revalidateTag("looks", "max"); revalidatePath("/"); revalidatePath("/looks/[collectionSlug]", "page"); revalidatePath("/look/[lookSlug]", "page"); revalidatePath("/admin/look-collections"); revalidatePath("/admin/looks"); }
async function getNextLookSortOrder(collectionId: string): Promise<number> { const snapshot = await getAdminDb().collection(COLLECTION).where("collectionId", "==", collectionId).orderBy("sortOrder", "desc").limit(1).get(); const highest = snapshot.docs[0]?.get("sortOrder"); return (typeof highest === "number" && Number.isFinite(highest) ? highest : 0) + 10; }
async function getNextHomepageFigureOrder(): Promise<number> { const snapshot = await getAdminDb().collection(COLLECTION).where("showAsHomepageFigure", "==", true).orderBy("homepageFigureOrder", "desc").limit(1).get(); const highest = snapshot.docs[0]?.get("homepageFigureOrder"); return (typeof highest === "number" && Number.isFinite(highest) ? highest : 0) + 10; }
