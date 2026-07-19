import { revalidatePath, revalidateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { lookInputSchema } from "@/lib/look-schema";
import { calculateLookPricing } from "@/lib/looks/pricing";
import type { Product } from "@/types/product";

export const dynamic = "force-dynamic";
const COLLECTION = "looks";
const PRODUCTS_COLLECTION = "products";
const COLLECTIONS_COLLECTION = "lookCollections";
type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { id } = await params;
  const parsed = lookInputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ code: "validation_failed", message: "Check the Look fields and try again.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  const docRef = getAdminDb().collection(COLLECTION).doc(id);
  const current = await docRef.get();
  if (!current.exists) return adminJsonError("Look not found", 404);
  const duplicateSnapshot = await getAdminDb().collection(COLLECTION).where("slug", "==", parsed.data.slug).limit(2).get();
  if (duplicateSnapshot.docs.some((doc) => doc.id !== id)) return Response.json({ code: "duplicate_slug", message: "A Look with this slug already exists." }, { status: 409 });
  const collection = await getAdminDb().collection(COLLECTIONS_COLLECTION).doc(parsed.data.collectionId).get();
  if (!collection.exists || collection.get("status") === "archived") return Response.json({ code: "collection_missing", message: "Selected Collection no longer exists." }, { status: 400 });
  const products = await readCanonicalProducts(parsed.data.productIds);
  if (products.unavailable.length) return Response.json({ code: "products_unavailable", message: `One or more selected Products are unavailable: ${products.unavailable.join(", ")}.`, fieldErrors: { productIds: ["One or more selected Products are unavailable."] } }, { status: 400 });
  const mode = (parsed.data.discountPercent ?? 0) > 0 || parsed.data.isPromo ? "sale" : "regular";
  const pricing = calculateLookPricing({ mode, enteredPriceDzd: parsed.data.priceDzd, discountPercent: parsed.data.discountPercent ?? 0, products: products.items });
  if (pricing.lookSellingPrice <= 0) return Response.json({ code: "validation_failed", message: "Look price must be greater than zero.", fieldErrors: { priceDzd: ["Look price must be greater than zero."] } }, { status: 400 });
  const canonicalData = { ...parsed.data, priceDzd: pricing.lookSellingPrice, compareAtPriceDzd: pricing.compareAtPriceDzd, discountPercent: pricing.discountPercent, isPromo: pricing.isPromo, costPriceDzd: pricing.totalLookCost };
  const currentSortOrder = current.get("sortOrder");
  const currentHomepageFigureOrder = current.get("homepageFigureOrder");
  const sortOrder = parsed.data.sortOrder ?? (typeof currentSortOrder === "number" ? currentSortOrder : 999);
  const homepageFigureOrder = parsed.data.showAsHomepageFigure ? parsed.data.homepageFigureOrder ?? (typeof currentHomepageFigureOrder === "number" ? currentHomepageFigureOrder : null) : null;
  await docRef.update({ ...canonicalData, sortOrder, homepageFigureOrder, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.email });
  revalidateLooks(canonicalData.slug, current.get("slug"), canonicalData.collectionSlug, current.get("collectionSlug"));
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
  revalidatePath("/admin/look-collections");
  revalidatePath("/admin/looks");
  if (typeof slug === "string") revalidatePath(`/look/${slug}`);
  if (typeof previousSlug === "string" && previousSlug !== slug) revalidatePath(`/look/${previousSlug}`);
  if (typeof collectionSlug === "string") revalidatePath(`/looks/${collectionSlug}`);
  if (typeof previousCollectionSlug === "string" && previousCollectionSlug !== collectionSlug) revalidatePath(`/looks/${previousCollectionSlug}`);
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
