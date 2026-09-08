import "server-only";
import { unstable_cache } from "next/cache";
import { getMissingFirebaseAdminEnv } from "@/lib/env";
import { getActiveProductsByIds } from "@/lib/firestore/products";
import type { Look, LookCollection, LookImage, LookWithProducts } from "@/types/look";

const COLLECTIONS = "lookCollections";
const LOOKS = "looks";
const READ_LIMIT = 60;

export async function listActiveLookCollections(limit = 8): Promise<LookCollection[]> {
  if (!isConfigured()) return [];
  try {
    return (await readCachedActiveLookCollections()).slice(0, clampLimit(limit, 8));
  } catch (error) {
    warnLooks("Active look collections query failed.", error);
    return [];
  }
}

export async function listHomepageLooks(limit = 20): Promise<Look[]> {
  if (!isConfigured()) return [];
  try {
    return (await readCachedHomepageLooks()).slice(0, clampLimit(limit, 20));
  } catch (error) {
    warnLooks("Homepage looks query failed.", error);
    return [];
  }
}

export async function listActiveLooks(limit = 20): Promise<Look[]> {
  if (!isConfigured()) return [];
  try {
    return (await readCachedActiveLooks()).slice(0, clampLimit(limit, 20));
  } catch (error) {
    warnLooks("Active looks query failed.", error);
    return [];
  }
}

export async function getActiveLookCollectionBySlug(slug: string): Promise<LookCollection | null> {
  if (!isConfigured()) return null;
  try {
    return await readCachedActiveLookCollectionBySlug(slug);
  } catch (error) {
    warnLooks(`Collection lookup failed for ${slug}.`, error);
    return null;
  }
}

export async function listActiveLooksByCollection(collection: Pick<LookCollection, "id" | "slug">): Promise<LookWithProducts[]> {
  if (!isConfigured()) return [];
  try {
    return await readCachedActiveLooksByCollection(collection.id);
  } catch (error) {
    warnLooks(`Looks query failed for collection ${collection.slug}.`, error);
    return [];
  }
}

export async function getActiveLookBySlug(slug: string): Promise<LookWithProducts | null> {
  if (!isConfigured()) return null;
  try {
    return await readCachedActiveLookBySlug(slug);
  } catch (error) {
    warnLooks(`Look lookup failed for ${slug}.`, error);
    return null;
  }
}

export async function getActiveLooksByIds(lookIds: string[]): Promise<Map<string, Look>> {
  const uniqueIds = Array.from(new Set(lookIds.filter(isString))).sort();

  if (!uniqueIds.length || !isConfigured()) return new Map();

  try {
    const looks = await readCachedActiveLooksByIds(uniqueIds);
    return new Map(looks.map((look) => [look.id, look]));
  } catch (error) {
    warnLooks("Favorite looks could not be resolved.", error);
    return new Map();
  }
}

const cacheOptions = { revalidate: 60, tags: ["looks"] };
const hydratedCacheOptions = { revalidate: 60, tags: ["looks", "products"] };

const readCachedActiveLookCollections = unstable_cache(async (): Promise<LookCollection[]> => {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const snapshot = await getAdminDb().collection(COLLECTIONS).where("status", "==", "active").limit(READ_LIMIT).get();
  return snapshot.docs.map((doc) => parseCollection(doc.id, doc.data())).filter((item): item is LookCollection => item !== null).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}, ["active-look-collections-v1"], cacheOptions);

const readCachedHomepageLooks = unstable_cache(async (): Promise<Look[]> => {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const snapshot = await getAdminDb().collection(LOOKS).where("status", "==", "active").where("showAsHomepageFigure", "==", true).limit(READ_LIMIT).get();
  return parseUniqueLooks(snapshot.docs).sort(compareHomepageLooks);
}, ["homepage-looks-v1"], cacheOptions);

const readCachedActiveLooks = unstable_cache(async (): Promise<Look[]> => {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const snapshot = await getAdminDb().collection(LOOKS).where("status", "==", "active").limit(READ_LIMIT).get();
  return parseUniqueLooks(snapshot.docs).sort(comparePublicLooks);
}, ["active-looks-v1"], cacheOptions);

const readCachedActiveLookCollectionBySlug = unstable_cache(async (slug: string): Promise<LookCollection | null> => {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const snapshot = await getAdminDb().collection(COLLECTIONS).where("slug", "==", slug).where("status", "==", "active").limit(1).get();
  return snapshot.docs[0] ? parseCollection(snapshot.docs[0].id, snapshot.docs[0].data()) : null;
}, ["active-look-collection-by-slug-v1"], cacheOptions);

const readCachedActiveLooksByCollection = unstable_cache(async (collectionId: string): Promise<LookWithProducts[]> => {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const snapshot = await getAdminDb().collection(LOOKS).where("collectionId", "==", collectionId).where("status", "==", "active").limit(READ_LIMIT).get();
  const looks = snapshot.docs.map((doc) => parseLook(doc.id, doc.data())).filter((item): item is Look => item !== null).sort(comparePublicLooks);
  return resolveLookProducts(looks);
}, ["active-looks-by-collection-v1"], hydratedCacheOptions);

const readCachedActiveLookBySlug = unstable_cache(async (slug: string): Promise<LookWithProducts | null> => {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const snapshot = await getAdminDb().collection(LOOKS).where("slug", "==", slug).where("status", "==", "active").limit(1).get();
  const look = snapshot.docs[0] ? parseLook(snapshot.docs[0].id, snapshot.docs[0].data()) : null;
  if (!look) return null;
  const [resolved] = await resolveLookProducts([look]);
  return resolved ?? null;
}, ["active-look-by-slug-v1"], hydratedCacheOptions);

const readCachedActiveLooksByIds = unstable_cache(async (lookIds: string[]): Promise<Look[]> => {
  const [{ getAdminDb }, { FieldPath }] = await Promise.all([import("@/lib/firebase/admin"), import("firebase-admin/firestore")]);
  const chunks = chunkIds(lookIds, 30);
  const snapshots = await Promise.all(chunks.map((chunk) => getAdminDb().collection(LOOKS).where(FieldPath.documentId(), "in", chunk).get()));
  return snapshots.flatMap((snapshot) => snapshot.docs).map((doc) => parseLook(doc.id, doc.data())).filter((look): look is Look => look?.status === "active");
}, ["active-looks-by-ids-v1"], cacheOptions);

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
    imagePosition: isString(data.imagePosition) ? data.imagePosition : isString(data.cardImagePosition) ? data.cardImagePosition : null,
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
    discountPercent: isNumber(data.discountPercent) ? data.discountPercent : 0,
    isPromo: data.isPromo === true,
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

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) chunks.push(ids.slice(index, index + size));
  return chunks;
}

function parseUniqueLooks(docs: FirebaseFirestore.QueryDocumentSnapshot[]): Look[] {
  const looks = new Map<string, Look>();
  docs.forEach((doc) => {
    const look = parseLook(doc.id, doc.data());
    if (look && !looks.has(look.id)) looks.set(look.id, look);
  });
  return [...looks.values()];
}

function clampLimit(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 0), READ_LIMIT);
}

function compareHomepageLooks(a: Look, b: Look): number {
  return (a.homepageFigureOrder ?? a.sortOrder) - (b.homepageFigureOrder ?? b.sortOrder)
    || a.sortOrder - b.sortOrder
    || a.id.localeCompare(b.id);
}

function comparePublicLooks(a: Look, b: Look): number {
  return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
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
