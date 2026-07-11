import { unstable_noStore as noStore } from "next/cache";
import { shopProducts, getStaticProductBySlug } from "@/constants/products";
import { getMissingFirebaseAdminEnv } from "@/lib/env";
import type { Product, ProductCategory, ProductColor, ProductImage, ProductSize, ProductStockMode } from "@/types/product";

const PRODUCTS_COLLECTION = "products";
const DEFAULT_PRODUCT_LIMIT = 12;
const MAX_PRODUCT_LIMIT = 60;
const ACTIVE_PRODUCT_READ_LIMIT = 60;

export async function listActiveProducts(requestedLimit = DEFAULT_PRODUCT_LIMIT): Promise<Product[]> {
  noStore();
  const limit = clampLimit(requestedLimit);

  if (shouldUseStaticFallback()) {
    return shopProducts.slice(0, limit);
  }

  if (!isAdminFirestoreConfigured()) {
    warnProducts("Firestore admin env is not configured; returning no storefront products. Set USE_STATIC_PRODUCT_FALLBACK=true for local demo fixtures.");
    return [];
  }

  try {
    const products = await readActiveProducts(ACTIVE_PRODUCT_READ_LIMIT);
    return sortByProductOrder(products).slice(0, limit);
  } catch (error) {
    warnProducts("Active product query failed; returning no storefront products.", error);
    return [];
  }
}

export async function listActiveProductsByPlacement(placement: "showInDrop001" | "showInFeaturedDrop", requestedLimit = DEFAULT_PRODUCT_LIMIT): Promise<Product[]> {
  noStore();
  const limit = clampLimit(requestedLimit);

  if (shouldUseStaticFallback()) {
    return shopProducts
      .filter((product) => product[placement])
      .sort((a, b) => getPlacementSortOrder(a, placement) - getPlacementSortOrder(b, placement))
      .slice(0, limit);
  }

  if (!isAdminFirestoreConfigured()) {
    warnProducts(`Firestore admin env is not configured; returning no ${placement} products.`);
    return [];
  }

  try {
    const products = await readActiveProducts(ACTIVE_PRODUCT_READ_LIMIT);
    return products
      .filter((product) => product[placement] === true)
      .sort((a, b) => getPlacementSortOrder(a, placement) - getPlacementSortOrder(b, placement))
      .slice(0, limit);
  } catch (error) {
    warnProducts(`Active ${placement} product query failed; returning no storefront products.`, error);
    return [];
  }
}

export async function listActivePromoProducts(requestedLimit = DEFAULT_PRODUCT_LIMIT): Promise<Product[]> {
  noStore();
  const limit = clampLimit(requestedLimit);

  if (shouldUseStaticFallback()) {
    return shopProducts.filter((product) => product.isPromo || product.showInFeaturedDrop).sort((a, b) => getPlacementSortOrder(a, "showInFeaturedDrop") - getPlacementSortOrder(b, "showInFeaturedDrop")).slice(0, limit);
  }

  if (!isAdminFirestoreConfigured()) {
    warnProducts("Firestore admin env is not configured; returning no promo products.");
    return [];
  }

  try {
    const products = await readActiveProducts(ACTIVE_PRODUCT_READ_LIMIT);
    return products
      .filter((product) => product.isPromo === true || product.showInFeaturedDrop === true || product.featured === true)
      .sort((a, b) => getPlacementSortOrder(a, "showInFeaturedDrop") - getPlacementSortOrder(b, "showInFeaturedDrop"))
      .slice(0, limit);
  } catch (error) {
    warnProducts("Active promo product query failed; returning no storefront products.", error);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  noStore();

  if (shouldUseStaticFallback()) {
    return getStaticProductBySlug(slug) ?? null;
  }

  if (!isAdminFirestoreConfigured()) {
    warnProducts(`Firestore admin env is not configured; product "${slug}" cannot be loaded.`);
    return null;
  }

  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const snapshot = await getAdminDb()
      .collection(PRODUCTS_COLLECTION)
      .where("slug", "==", slug)
      .where("status", "==", "active")
      .limit(1)
      .get();
    return snapshot.docs[0] ? parseProduct(snapshot.docs[0].id, snapshot.docs[0].data()) : null;
  } catch (error) {
    warnProducts(`Active product lookup failed for slug "${slug}"; returning not found.`, error);
    return null;
  }
}

async function readActiveProducts(limit: number): Promise<Product[]> {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const snapshot = await getAdminDb()
    .collection(PRODUCTS_COLLECTION)
    .where("status", "==", "active")
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => parseProduct(doc.id, doc.data()))
    .filter((product): product is Product => product !== null);
}

function isAdminFirestoreConfigured(): boolean {
  return getMissingFirebaseAdminEnv().length === 0;
}

function shouldUseStaticFallback(): boolean {
  return process.env.USE_STATIC_PRODUCT_FALLBACK === "true";
}

function clampLimit(requestedLimit: number): number {
  if (!Number.isFinite(requestedLimit)) return DEFAULT_PRODUCT_LIMIT;
  return Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PRODUCT_LIMIT);
}

function sortByProductOrder(products: Product[]): Product[] {
  return [...products].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function getPlacementSortOrder(product: Product, placement: "showInDrop001" | "showInFeaturedDrop"): number {
  if (placement === "showInFeaturedDrop") return product.featuredSortOrder ?? product.sortOrder;
  return product.sortOrder;
}

function parseProduct(id: string, data: Record<string, unknown>): Product | null {
  if (!isString(data.slug) || !isString(data.name) || !isCategory(data.category) || data.status !== "active" || !isNumber(data.priceDzd)) {
    return null;
  }

  const images = parseImages(data.images, data.name);
  const colors = parseColors(data.colors);

  if (!images.length || !colors.length) return null;

  return {
    id,
    slug: data.slug,
    name: data.name,
    description: isString(data.description) ? data.description : "Built for daily movement. Soft, structured, and made for the runners who show up.",
    details: parseStringArray(data.details),
    category: data.category,
    status: "active",
    priceDzd: data.priceDzd,
    basePriceDzd: isNumber(data.basePriceDzd) ? data.basePriceDzd : null,
    compareAtPriceDzd: isNumber(data.compareAtPriceDzd) ? data.compareAtPriceDzd : null,
    costPriceDzd: isNumber(data.costPriceDzd) ? data.costPriceDzd : null,
    discountPercent: isNumber(data.discountPercent) ? data.discountPercent : 0,
    images,
    colors,
    sizes: parseSizes(data.sizes),
    stockMode: isStockMode(data.stockMode) ? data.stockMode : "unlimited",
    stockQty: isNumber(data.stockQty) ? data.stockQty : null,
    inStock: isInStock(data),
    featured: typeof data.featured === "boolean" ? data.featured : false,
    sizeGuideEnabled: typeof data.sizeGuideEnabled === "boolean" ? data.sizeGuideEnabled : false,
    sizeGuideImageUrl: isString(data.sizeGuideImageUrl) ? data.sizeGuideImageUrl : null,
    sizeGuideImagePublicId: isString(data.sizeGuideImagePublicId) ? data.sizeGuideImagePublicId : null,
    showInDrop001: data.showInDrop001 === true,
    showInFeaturedDrop: data.showInFeaturedDrop === true,
    showInShopTheLook: data.showInShopTheLook === true,
    featuredSortOrder: isNumber(data.featuredSortOrder) ? data.featuredSortOrder : null,
    lookGroupSlug: isString(data.lookGroupSlug) ? data.lookGroupSlug : null,
    isPromo: data.isPromo === true,
    dropSlug: data.dropSlug === "drop-001" ? "drop-001" : null,
    sortOrder: isNumber(data.sortOrder) ? data.sortOrder : 999,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function isInStock(data: Record<string, unknown>): boolean {
  if (data.stockMode === "limited") return isNumber(data.stockQty) && data.stockQty > 0;
  return data.inStock !== false;
}

function parseImages(value: unknown, productName: string): ProductImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (typeof entry === "string" && entry.trim()) return [{ url: entry.trim(), alt: `${productName} image ${index + 1}` }];
    if (!isRecord(entry) || !isString(entry.url)) return [];
    return [{ url: entry.url, alt: isString(entry.alt) ? entry.alt : `${productName} image ${index + 1}` }];
  });
}

function parseColors(value: unknown): ProductColor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string" && /^#[0-9a-fA-F]{6}$/.test(entry.trim())) return [{ name: entry.trim(), hex: entry.trim() }];
    if (!isRecord(entry) || !isString(entry.hex)) return [];
    return [{ name: isString(entry.name) ? entry.name : entry.hex, hex: entry.hex }];
  });
}

function parseSizes(value: unknown): ProductSize[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string" && entry.trim()) return [{ label: entry.trim() }];
    if (!isRecord(entry) || !isString(entry.label)) return [];
    return [{ label: entry.label }];
  });
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isString) : [];
}

function isCategory(value: unknown): value is ProductCategory {
  return value === "tshirts" || value === "pants" || value === "hoodies" || value === "accessories";
}

function isStockMode(value: unknown): value is ProductStockMode {
  return value === "unlimited" || value === "limited" || value === "made_to_order";
}

function toIsoString(value: unknown): string | null {
  if (isString(value)) return value;
  if (isRecord(value) && typeof value.toDate === "function") {
    const dateValue = value.toDate();
    return dateValue instanceof Date && Number.isFinite(dateValue.getTime()) ? dateValue.toISOString() : null;
  }
  return null;
}

function warnProducts(message: string, error?: unknown) {
  if (error) console.warn(`[products] ${message}`, error);
  else console.warn(`[products] ${message}`);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
