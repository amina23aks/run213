import { unstable_noStore as noStore } from "next/cache";
import { getMissingFirebaseAdminEnv } from "@/lib/env";
import { getActiveProductsByIds } from "@/lib/firestore/products";
import type { Look, LookCollection, LookImage, LookWithProducts } from "@/types/look";

const COLLECTIONS = "lookCollections";
const LOOKS = "looks";
const READ_LIMIT = 60;

export async function listActiveLookCollections(limit = 8): Promise<LookCollection[]> {
  noStore();
  if (!isConfigured()) return [];
  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const snapshot = await getAdminDb().collection(COLLECTIONS).where("status", "==", "active").limit(READ_LIMIT).get();
    return snapshot.docs.map((doc) => parseCollection(doc.id, doc.data())).filter((item): item is LookCollection => item !== null).sort((a, b) => a.sortOrder - b.sortOrder).slice(0, limit);
  } catch (error) {
    warnLooks("Active look collections query failed.", error);
    return [];
  }
}

export async function listHomepageLooks(limit = 4): Promise<Look[]> {
  noStore();
  if (!isConfigured()) return [];
  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const snapshot = await getAdminDb().collection(LOOKS).where("status", "==", "active").where("showAsHomepageFigure", "==", true).limit(READ_LIMIT).get();
    return snapshot.docs.map((doc) => parseLook(doc.id, doc.data())).filter((item): item is Look => item !== null).sort((a, b) => (a.homepageFigureOrder ?? a.sortOrder) - (b.homepageFigureOrder ?? b.sortOrder)).slice(0, limit);
  } catch (error) {
    warnLooks("Homepage looks query failed.", error);
    return [];
  }
}

export async function getActiveLookCollectionBySlug(slug: string): Promise<LookCollection | null> {
  noStore();
  if (!isConfigured()) return null;
  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const snapshot = await getAdminDb().collection(COLLECTIONS).where("slug", "==", slug).where("status", "==", "active").limit(1).get();
    return snapshot.docs[0] ? parseCollection(snapshot.docs[0].id, snapshot.docs[0].data()) : null;
  } catch (error) {
    warnLooks(`Collection lookup failed for ${slug}.`, error);
    return null;
  }
}

export async function listActiveLooksByCollection(collection: Pick<LookCollection, "id" | "slug">): Promise<LookWithProducts[]> {
  noStore();
  if (!isConfigured()) return [];
  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const snapshot = await getAdminDb().collection(LOOKS).where("collectionId", "==", collection.id).where("status", "==", "active").limit(READ_LIMIT).get();
    const looks = snapshot.docs.map((doc) => parseLook(doc.id, doc.data())).filter((item): item is Look => item !== null).sort((a, b) => a.sortOrder - b.sortOrder);
    return resolveLookProducts(looks);
  } catch (error) {
    warnLooks(`Looks query failed for collection ${collection.slug}.`, error);
    return [];
  }
}

export async function getActiveLookBySlug(slug: string): Promise<LookWithProducts | null> {
  noStore();
  if (!isConfigured()) return null;
  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const snapshot = await getAdminDb().collection(LOOKS).where("slug", "==", slug).where("status", "==", "active").limit(1).get();
    const look = snapshot.docs[0] ? parseLook(snapshot.docs[0].id, snapshot.docs[0].data()) : null;
    if (!look) return null;
    const [resolved] = await resolveLookProducts([look]);
    return resolved ?? null;
  } catch (error) {
    warnLooks(`Look lookup failed for ${slug}.`, error);
    return null;
  }
}

async function resolveLookProducts(looks: Look[]): Promise<LookWithProducts[]> {
  const productIds = looks.flatMap((look) => look.productIds);
  const products = await getActiveProductsByIds(productIds);
  return looks.map((look) => ({ ...look, products: look.productIds.map((productId) => ({ productId, product: products.get(productId) ?? null })) }));
}

function parseCollection(id: string, data: Record<string, unknown>): LookCollection | null {
  if (!isString(data.slug) || !isString(data.name) || !isImage(data.cardImage) || !isStatus(data.status)) return null;
  return {
    id,
    slug: data.slug,
    name: data.name,
    subtitle: isString(data.subtitle) ? data.subtitle : "",
    description: isString(data.description) ? data.description : "",
    cardImage: data.cardImage,
    status: data.status,
    sortOrder: isNumber(data.sortOrder) ? data.sortOrder : 999,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function parseLook(id: string, data: Record<string, unknown>): Look | null {
  if (!isString(data.collectionId) || !isString(data.collectionSlug) || !isString(data.slug) || !isString(data.name) || !isImage(data.heroImage) || !isStatus(data.status)) return null;
  const priceDzd = isNumber(data.priceDzd) && Number.isInteger(data.priceDzd) && data.priceDzd > 0 ? data.priceDzd : 0;
  if (data.status === "active" && priceDzd <= 0) return null;
  return {
    id,
    collectionId: data.collectionId,
    collectionSlug: data.collectionSlug,
    slug: data.slug,
    name: data.name,
    numberLabel: isString(data.numberLabel) ? data.numberLabel : null,
    description: isString(data.description) ? data.description : "",
    priceDzd,
    compareAtPriceDzd: isNumber(data.compareAtPriceDzd) ? data.compareAtPriceDzd : null,
    heroImage: data.heroImage,
    figureImage: isImage(data.figureImage) ? data.figureImage : null,
    productIds: Array.isArray(data.productIds) ? data.productIds.filter(isString) : [],
    status: data.status,
    sortOrder: isNumber(data.sortOrder) ? data.sortOrder : 999,
    showAsHomepageFigure: data.showAsHomepageFigure === true,
    homepageFigureOrder: isNumber(data.homepageFigureOrder) ? data.homepageFigureOrder : null,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function isConfigured() { return getMissingFirebaseAdminEnv().length === 0; }
function isStatus(value: unknown): value is "draft" | "active" | "archived" { return value === "draft" || value === "active" || value === "archived"; }
function isImage(value: unknown): value is LookImage { return isRecord(value) && isString(value.url) && isString(value.alt); }
function isString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function toIsoString(value: unknown): string | null {
  if (isString(value)) return value;
  if (isRecord(value) && typeof value.toDate === "function") {
    const dateValue = value.toDate();
    return dateValue instanceof Date && Number.isFinite(dateValue.getTime()) ? dateValue.toISOString() : null;
  }
  return null;
}
function warnLooks(message: string, error?: unknown) { if (error) console.warn(`[looks] ${message}`, error); else console.warn(`[looks] ${message}`); }
