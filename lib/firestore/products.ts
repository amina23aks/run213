import { shopProducts, getStaticProductBySlug } from "@/constants/products";
import { getMissingFirebaseAdminEnv } from "@/lib/env";
import type { Product, ProductCategory, ProductColor, ProductImage, ProductSize, ProductStockMode } from "@/types/product";

const PRODUCTS_COLLECTION = "products";
const DEFAULT_PRODUCT_LIMIT = 12;
const MAX_PRODUCT_LIMIT = 24;

export async function listActiveProducts(requestedLimit = DEFAULT_PRODUCT_LIMIT): Promise<Product[]> {
  if (!isAdminFirestoreConfigured()) {
    return shopProducts.slice(0, clampLimit(requestedLimit));
  }


  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const snapshot = await getAdminDb()
      .collection(PRODUCTS_COLLECTION)
      .where("status", "==", "active")
      .orderBy("sortOrder", "asc")
      .limit(clampLimit(requestedLimit))
      .get();
    const products = snapshot.docs.map((doc) => parseProduct(doc.id, doc.data())).filter((product): product is Product => product !== null);

    return products.length ? products : shopProducts.slice(0, clampLimit(requestedLimit));
  } catch {
    console.warn("Falling back to static products because active products could not be read with the server admin API.");
    return shopProducts.slice(0, clampLimit(requestedLimit));
  }
}

export async function listActiveProductsByPlacement(placement: "showInDrop001" | "showInFeaturedDrop", requestedLimit = DEFAULT_PRODUCT_LIMIT): Promise<Product[]> {
  const fallbackProducts = shopProducts
    .filter((product) => product[placement])
    .sort((a, b) => getPlacementSortOrder(a, placement) - getPlacementSortOrder(b, placement))
    .slice(0, clampLimit(requestedLimit));

  if (!isAdminFirestoreConfigured()) {
    return fallbackProducts;
  }

  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const sortField = placement === "showInFeaturedDrop" ? "featuredSortOrder" : "sortOrder";
    const snapshot = await getAdminDb()
      .collection(PRODUCTS_COLLECTION)
      .where("status", "==", "active")
      .where(placement, "==", true)
      .orderBy(sortField, "asc")
      .limit(clampLimit(requestedLimit))
      .get();
    const products = snapshot.docs.map((doc) => parseProduct(doc.id, doc.data())).filter((product): product is Product => product !== null);

    return products.length ? products : fallbackProducts;
  } catch {
    console.warn(`Falling back to static products because server active ${placement} products could not be read.`);
    return fallbackProducts;
  }
}

function getPlacementSortOrder(product: Product, placement: "showInDrop001" | "showInFeaturedDrop"): number {
  if (placement === "showInFeaturedDrop") {
    return product.featuredSortOrder ?? product.sortOrder;
  }

  return product.sortOrder;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isAdminFirestoreConfigured()) {
    return getStaticProductBySlug(slug) ?? null;
  }

  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const snapshot = await getAdminDb()
      .collection(PRODUCTS_COLLECTION)
      .where("slug", "==", slug)
      .where("status", "==", "active")
      .limit(1)
      .get();
    const product = snapshot.docs[0] ? parseProduct(snapshot.docs[0].id, snapshot.docs[0].data()) : null;

    return product ?? getStaticProductBySlug(slug) ?? null;
  } catch {
    console.warn(`Falling back to static product for slug "${slug}" because server active product read failed.`);
    return getStaticProductBySlug(slug) ?? null;
  }
}

function isAdminFirestoreConfigured(): boolean {
  return getMissingFirebaseAdminEnv().length === 0;
}

function clampLimit(requestedLimit: number): number {
  if (!Number.isFinite(requestedLimit)) {
    return DEFAULT_PRODUCT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PRODUCT_LIMIT);
}

function parseProduct(id: string, data: Record<string, unknown>): Product | null {
  if (!isString(data.slug) || !isString(data.name) || !isCategory(data.category) || data.status !== "active" || !isNumber(data.priceDzd)) {
    return null;
  }

  const images = parseImages(data.images);
  const colors = parseColors(data.colors);

  if (!images.length || !colors.length) {
    return null;
  }

  return {
    id,
    slug: data.slug,
    name: data.name,
    description: isString(data.description) ? data.description : "Built for daily movement. Soft, structured, and made for the runners who show up.",
    details: parseStringArray(data.details),
    category: data.category,
    status: data.status,
    priceDzd: data.priceDzd,
    basePriceDzd: isNumber(data.basePriceDzd) ? data.basePriceDzd : null,
    compareAtPriceDzd: isNumber(data.compareAtPriceDzd) ? data.compareAtPriceDzd : null,
    costPriceDzd: isNumber(data.costPriceDzd) ? data.costPriceDzd : null,
    discountPercent: isNumber(data.discountPercent) ? data.discountPercent : 0,
    images,
    colors,
    sizes: parseSizes(data.sizes),
    stockMode: isStockMode(data.stockMode) ? data.stockMode : "made_to_order",
    stockQty: isNumber(data.stockQty) ? data.stockQty : null,
    inStock: typeof data.inStock === "boolean" ? data.inStock : true,
    featured: typeof data.featured === "boolean" ? data.featured : false,
    sizeGuideEnabled: typeof data.sizeGuideEnabled === "boolean" ? data.sizeGuideEnabled : false,
    sizeGuideImageUrl: isString(data.sizeGuideImageUrl) ? data.sizeGuideImageUrl : null,
    sizeGuideImagePublicId: isString(data.sizeGuideImagePublicId) ? data.sizeGuideImagePublicId : null,
    showInDrop001: typeof data.showInDrop001 === "boolean" ? data.showInDrop001 : false,
    showInFeaturedDrop: typeof data.showInFeaturedDrop === "boolean" ? data.showInFeaturedDrop : false,
    showInShopTheLook: typeof data.showInShopTheLook === "boolean" ? data.showInShopTheLook : false,
    featuredSortOrder: isNumber(data.featuredSortOrder) ? data.featuredSortOrder : null,
    lookGroupSlug: isString(data.lookGroupSlug) ? data.lookGroupSlug : null,
    isPromo: typeof data.isPromo === "boolean" ? data.isPromo : false,
    dropSlug: data.dropSlug === "drop-001" ? "drop-001" : null,
    sortOrder: isNumber(data.sortOrder) ? data.sortOrder : 999,
    createdAt: isString(data.createdAt) ? data.createdAt : null,
    updatedAt: isString(data.updatedAt) ? data.updatedAt : null,
  };
}

function parseImages(value: unknown): ProductImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isProductImage);
}

function parseColors(value: unknown): ProductColor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isProductColor);
}

function parseSizes(value: unknown): ProductSize[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isProductSize);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isString);
}

function isProductImage(value: unknown): value is ProductImage {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.url) && isString(value.alt);
}

function isProductColor(value: unknown): value is ProductColor {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.name) && isString(value.hex);
}

function isProductSize(value: unknown): value is ProductSize {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.label);
}

function isCategory(value: unknown): value is ProductCategory {
  return value === "tshirts" || value === "pants" || value === "hoodies" || value === "accessories";
}

function isStockMode(value: unknown): value is ProductStockMode {
  return value === "unlimited" || value === "limited" || value === "made_to_order";
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
