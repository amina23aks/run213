import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  limit,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
  type WithFieldValue,
} from "firebase/firestore";

import { getDb } from "./firebaseClient";

export type AdminProductCategory = string;
export type AdminProductStatus = "active" | "inactive";

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
  costPrice: number;
  category: AdminProductCategory;
  designTheme: string;
  sizes: string[];
  colors: { hex: string; image?: string }[];
  sizeGuideEnabled: boolean;
  sizeGuideImageUrl?: string | null;
  sizeGuideImagePublicId?: string | null;
  soldOutSizes?: string[];
  soldOutColorCodes?: string[];
  stockMode?: "unlimited" | "limited";
  stockQty?: number;
  stock?: number;
  inStock: boolean;
  images: { main: string; gallery: string[] };
  gender?: "unisex" | "men" | "women";
  status: AdminProductStatus;
  featuredDrops?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type AdminProductInput = Omit<
  AdminProduct,
  "id" | "createdAt" | "updatedAt" | "costPrice" | "status"
> & {
  costPrice?: number;
  status?: AdminProductStatus;
};
type AdminProductWrite = AdminProductInput & {
  updatedAt: Timestamp;
  createdAt?: Timestamp;
};

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error(
      "Firebase is not configured. Please check environment variables.",
    );
  }
  return db;
}

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item)))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseColorObjects(value: unknown): AdminProduct["colors"] {
  const normalizeEntry = (item: unknown) => {
    if (typeof item === "string") {
      const hex = item.trim();
      return hex ? { hex } : null;
    }
    if (item && typeof item === "object") {
      const obj = item as { id?: unknown; hex?: unknown; image?: unknown };
      const hex =
        (typeof obj.hex === "string" && obj.hex.trim()) ||
        (typeof obj.id === "string" && obj.id.trim()) ||
        null;
      if (!hex) return null;
      const image =
        typeof obj.image === "string" && obj.image.trim()
          ? obj.image.trim()
          : undefined;
      const result: AdminProduct["colors"][number] = image
        ? { hex, image }
        : { hex };
      return result;
    }
    return null;
  };

  if (!value) return [];
  if (Array.isArray(value)) {
    const normalized = value
      .map(normalizeEntry)
      .filter((item): item is NonNullable<ReturnType<typeof normalizeEntry>> =>
        Boolean(item),
      );
    if (normalized.length === 0 && value.length === 0) return [];
    return normalized;
  }
  return [];
}

function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((entry) => removeUndefinedDeep(entry))
      .filter(
        (entry): entry is Exclude<typeof entry, undefined> =>
          entry !== undefined,
      );
    return cleaned as unknown as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      const cleaned = removeUndefinedDeep(val);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    });
    return result as unknown as T;
  }

  return value === undefined ? (undefined as unknown as T) : value;
}

function computeFinalPrice(basePrice: number, discountPercent: number) {
  const base = Number(basePrice) || 0;
  const discount = Number(discountPercent) || 0;
  return Math.max(base * (1 - discount / 100), 0);
}

function normalizeImages(value: unknown): { main: string; gallery: string[] } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as { main?: unknown; gallery?: unknown };
    const main = typeof obj.main === "string" ? obj.main : "";
    const gallery = Array.isArray(obj.gallery)
      ? (obj.gallery as unknown[])
          .map((item) => (typeof item === "string" ? item : null))
          .filter((item): item is string => Boolean(item))
      : [];
    return { main, gallery };
  }

  if (Array.isArray(value)) {
    const [main, ...gallery] = (value as unknown[])
      .map((item) => (typeof item === "string" ? item : null))
      .filter((item): item is string => Boolean(item));
    return { main: main ?? "", gallery };
  }

  return { main: "", gallery: [] };
}

function normalizeProduct(data: DocumentData, id: string): AdminProduct {
  const basePrice =
    typeof data.basePrice === "number"
      ? data.basePrice
      : Number(data.basePrice ?? 0);
  const discountPercent =
    typeof data.discountPercent === "number"
      ? data.discountPercent
      : Number(data.discountPercent ?? 0);

  const finalPrice =
    typeof data.finalPrice === "number"
      ? data.finalPrice
      : computeFinalPrice(
          basePrice,
          Number.isFinite(discountPercent) ? discountPercent : 0,
        );
  const rawCostPrice = data.costPrice ?? data.purchasePrice ?? 0;
  const costPrice =
    typeof rawCostPrice === "number" ? rawCostPrice : Number(rawCostPrice ?? 0);

  const legacyStockQuantity =
    typeof data.stockQuantity === "number"
      ? data.stockQuantity
      : typeof data.stock === "number"
        ? data.stock
        : Number(data.stock ?? 0);
  const inStockValue = typeof data.inStock === "boolean" ? data.inStock : true;
  const requestedMode =
    data.stockMode === "limited" || data.stockMode === "unlimited"
      ? data.stockMode
      : null;
  const stockMode =
    requestedMode ??
    (inStockValue === false
      ? "limited"
      : Number.isFinite(legacyStockQuantity)
        ? "limited"
        : "unlimited");
  const stockQty =
    stockMode === "limited"
      ? Math.max(
          Number(
            typeof data.stockQty === "number"
              ? data.stockQty
              : Number.isFinite(legacyStockQuantity)
                ? legacyStockQuantity
                : 0,
          ),
          0,
        )
      : undefined;
  const resolvedInStock = stockMode === "limited" ? (stockQty ?? 0) > 0 : true;

  return {
    id,
    name: typeof data.name === "string" ? data.name : "Untitled product",
    slug:
      typeof data.slug === "string" && data.slug.length
        ? data.slug
        : slugifyName(data.name ?? id),
    description:
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : undefined,
    basePrice,
    discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
    finalPrice,
    costPrice: Number.isFinite(costPrice) ? Math.max(costPrice, 0) : 0,
    category: (data.category as AdminProductCategory) ?? "tshirts",
    designTheme:
      typeof data.designTheme === "string" ? data.designTheme : "simple",
    sizes: parseStringArray(data.sizes),
    colors: parseColorObjects(data.colors),
    sizeGuideEnabled:
      typeof data.sizeGuideEnabled === "boolean"
        ? data.sizeGuideEnabled
        : false,
    sizeGuideImageUrl:
      typeof data.sizeGuideImageUrl === "string" &&
      data.sizeGuideImageUrl.trim()
        ? data.sizeGuideImageUrl.trim()
        : null,
    sizeGuideImagePublicId:
      typeof data.sizeGuideImagePublicId === "string" &&
      data.sizeGuideImagePublicId.trim()
        ? data.sizeGuideImagePublicId.trim()
        : null,
    soldOutSizes: parseStringArray(data.soldOutSizes),
    soldOutColorCodes: parseStringArray(data.soldOutColorCodes),
    stockMode,
    stockQty,
    stock:
      typeof data.stock === "number" ? data.stock : Number(data.stock ?? 0),
    inStock: resolvedInStock,
    images: normalizeImages(data.images),
    gender:
      typeof data.gender === "string"
        ? (data.gender as AdminProduct["gender"])
        : undefined,
    status: data.status === "inactive" ? "inactive" : "active",
    featuredDrops: parseStringArray(data.featuredDrops),
    createdAt:
      (data.createdAt as Timestamp) ??
      (serverTimestamp() as unknown as Timestamp),
    updatedAt:
      (data.updatedAt as Timestamp) ??
      (serverTimestamp() as unknown as Timestamp),
  };
}

function sanitizeCreate(
  input: AdminProductInput,
): WithFieldValue<AdminProductWrite> {
  const normalizedColors = parseColorObjects(input.colors);
  const soldOutSizes = parseStringArray(input.soldOutSizes);
  const soldOutColorCodes = parseStringArray(input.soldOutColorCodes);
  const stockMode = input.stockMode === "limited" ? "limited" : "unlimited";
  const stockQty =
    stockMode === "limited"
      ? Math.max(Number(input.stockQty ?? 0), 0)
      : undefined;
  const sizeGuideEnabled = Boolean(input.sizeGuideEnabled);
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    slug: input.slug || slugifyName(input.name),
    basePrice: Number(input.basePrice),
    discountPercent: Number(input.discountPercent) || 0,
    finalPrice: computeFinalPrice(
      Number(input.basePrice),
      Number(input.discountPercent) || 0,
    ),
    costPrice: Math.max(Number(input.costPrice ?? 0) || 0, 0),
    category: input.category,
    designTheme: input.designTheme,
    sizes: input.sizes ?? [],
    colors: normalizedColors,
    sizeGuideEnabled,
    sizeGuideImageUrl: sizeGuideEnabled
      ? (input.sizeGuideImageUrl ?? null)
      : null,
    sizeGuideImagePublicId: sizeGuideEnabled
      ? (input.sizeGuideImagePublicId ?? null)
      : null,
    soldOutSizes: soldOutSizes.length > 0 ? soldOutSizes : undefined,
    soldOutColorCodes:
      soldOutColorCodes.length > 0 ? soldOutColorCodes : undefined,
    stockMode,
    stockQty,
    stock: stockMode === "limited" ? (stockQty ?? 0) : undefined,
    inStock: stockMode === "limited" ? (stockQty ?? 0) > 0 : true,
    images: input.images ?? { main: "", gallery: [] },
    gender: input.gender ?? null,
    status: input.status === "inactive" ? "inactive" : "active",
    featuredDrops: parseStringArray(input.featuredDrops),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Only include description if it's a non-empty string
  if (
    input.description &&
    typeof input.description === "string" &&
    input.description.trim()
  ) {
    payload.description = input.description.trim();
  }

  return removeUndefinedDeep(payload) as WithFieldValue<AdminProductWrite>;
}

function sanitizeUpdate(
  patch: Partial<AdminProduct>,
): WithFieldValue<Partial<AdminProductWrite>> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (patch.name !== undefined) {
    payload.name = patch.name.trim();
    payload.slug = slugifyName(patch.name);
  }
  if (patch.slug !== undefined) payload.slug = slugifyName(patch.slug);
  if (patch.description !== undefined) {
    // Only include description if it's a non-empty string, otherwise set to null to remove it
    if (
      patch.description &&
      typeof patch.description === "string" &&
      patch.description.trim()
    ) {
      payload.description = patch.description.trim();
    } else {
      payload.description = null;
    }
  }
  if (patch.basePrice !== undefined)
    payload.basePrice = Number(patch.basePrice);
  if (patch.discountPercent !== undefined)
    payload.discountPercent = Number(patch.discountPercent) || 0;
  if (patch.costPrice !== undefined)
    payload.costPrice = Math.max(Number(patch.costPrice ?? 0) || 0, 0);
  if (patch.basePrice !== undefined || patch.discountPercent !== undefined) {
    const base = patch.basePrice !== undefined ? Number(patch.basePrice) : 0;
    const discount =
      patch.discountPercent !== undefined
        ? Number(patch.discountPercent) || 0
        : 0;
    payload.finalPrice = computeFinalPrice(base, discount);
  }
  if (patch.category !== undefined) payload.category = patch.category;
  if (patch.designTheme !== undefined) payload.designTheme = patch.designTheme;
  if (patch.sizes !== undefined) payload.sizes = patch.sizes;
  if (patch.colors !== undefined)
    payload.colors = parseColorObjects(patch.colors);
  if (patch.sizeGuideEnabled !== undefined) {
    payload.sizeGuideEnabled = patch.sizeGuideEnabled;
    if (!patch.sizeGuideEnabled) {
      payload.sizeGuideImageUrl = null;
      payload.sizeGuideImagePublicId = null;
    }
  }
  if (patch.sizeGuideImageUrl !== undefined) {
    payload.sizeGuideImageUrl = patch.sizeGuideImageUrl
      ? patch.sizeGuideImageUrl
      : null;
  }
  if (patch.sizeGuideImagePublicId !== undefined) {
    payload.sizeGuideImagePublicId = patch.sizeGuideImagePublicId
      ? patch.sizeGuideImagePublicId
      : null;
  }
  if (patch.soldOutSizes !== undefined) {
    const parsed = parseStringArray(patch.soldOutSizes);
    payload.soldOutSizes = parsed.length > 0 ? parsed : null;
  }
  if (patch.soldOutColorCodes !== undefined) {
    const parsed = parseStringArray(patch.soldOutColorCodes);
    payload.soldOutColorCodes = parsed.length > 0 ? parsed : null;
  }
  if (patch.stockMode !== undefined) {
    payload.stockMode = patch.stockMode === "limited" ? "limited" : "unlimited";
  }
  if (
    patch.stockQty !== undefined ||
    patch.stock !== undefined ||
    patch.stockMode !== undefined
  ) {
    const nextMode =
      (payload.stockMode as AdminProduct["stockMode"]) ??
      patch.stockMode ??
      "unlimited";
    const quantity =
      nextMode === "limited"
        ? Math.max(Number(patch.stockQty ?? patch.stock ?? 0), 0)
        : undefined;
    payload.stockQty = nextMode === "limited" ? quantity : null;
    payload.stock = nextMode === "limited" ? quantity : null;
    payload.inStock =
      nextMode === "limited" ? Boolean(quantity && quantity > 0) : true;
  }
  if (patch.images !== undefined) payload.images = patch.images;
  if (patch.gender !== undefined) payload.gender = patch.gender ?? null;
  if (patch.status !== undefined)
    payload.status = patch.status === "inactive" ? "inactive" : "active";
  if (patch.featuredDrops !== undefined)
    payload.featuredDrops = parseStringArray(patch.featuredDrops);

  return removeUndefinedDeep(payload) as WithFieldValue<
    Partial<AdminProductWrite>
  >;
}

function wrapPermission<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    if (
      typeof err === "object" &&
      err &&
      "code" in err &&
      (err as { code?: string }).code === "permission-denied"
    ) {
      throw new Error("Missing or insufficient permissions.");
    }
    throw err;
  });
}

export type AdminProductsPageResult = {
  products: AdminProduct[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
};

export async function listAdminProductsPage(
  limitCount = 25,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
): Promise<AdminProductsPageResult> {
  const db = getDbOrThrow();
  const safeLimit = Math.min(Math.max(Math.floor(limitCount), 1), 50);
  const constraints = [orderBy(documentId())];
  const productsQuery = query(
    collection(db, "products"),
    ...(cursor
      ? [...constraints, startAfter(cursor), limit(safeLimit)]
      : [...constraints, limit(safeLimit)]),
  );
  return wrapPermission(async () => {
    const snapshot = await getDocs(productsQuery);
    return {
      products: snapshot.docs.map((docSnapshot) =>
        normalizeProduct(docSnapshot.data(), docSnapshot.id),
      ),
      nextCursor:
        snapshot.docs.length === safeLimit
          ? snapshot.docs[snapshot.docs.length - 1]
          : null,
    };
  });
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const page = await listAdminProductsPage();
  return page.products;
}

export async function fetchProductById(
  productId: string,
): Promise<AdminProduct | null> {
  const db = getDbOrThrow();
  const ref = doc(db, "products", productId);
  return wrapPermission(async () => {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    return normalizeProduct(snapshot.data(), snapshot.id);
  });
}

export async function createAdminProduct(
  input: AdminProductInput,
): Promise<void> {
  const db = getDbOrThrow();
  const payload = sanitizeCreate(input);
  return wrapPermission(async () => {
    await addDoc(collection(db, "products"), payload);
  });
}

export async function updateAdminProduct(
  productId: string,
  updates: Partial<AdminProduct>,
): Promise<void> {
  const db = getDbOrThrow();
  const payload = sanitizeUpdate(updates);
  const ref = doc(db, "products", productId);
  return wrapPermission(async () => updateDoc(ref, payload));
}

export async function deleteAdminProduct(productId: string): Promise<void> {
  const db = getDbOrThrow();
  const ref = doc(db, "products", productId);
  return wrapPermission(async () => deleteDoc(ref));
}
