export const FAVORITES_STORAGE_KEY = "213run-favorites-v1";

export const LEGACY_FAVORITES_STORAGE_KEYS = [
  "213run-favorites",
  "run213-favorites",
  "run213-product-favorites",
  "213run-product-favorites",
  "213run-look-favorites",
] as const;

export type FavoriteItemType = "product" | "look";

export type StoredFavorites = {
  productIds: string[];
  lookIds: string[];
  updatedAt: number;
};

const EMPTY_FAVORITES: StoredFavorites = { productIds: [], lookIds: [], updatedAt: 0 };

export function isValidFavoriteId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 180;
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(isValidFavoriteId))];
}

export function normalizeStoredFavorites(value: unknown): StoredFavorites {
  if (!value || typeof value !== "object") return { ...EMPTY_FAVORITES };
  const record = value as { productIds?: unknown; lookIds?: unknown; updatedAt?: unknown };
  return {
    productIds: normalizeIds(record.productIds),
    lookIds: normalizeIds(record.lookIds),
    updatedAt: typeof record.updatedAt === "number" && Number.isFinite(record.updatedAt) ? record.updatedAt : Date.now(),
  };
}

export function parseStoredFavorites(raw: string | null): StoredFavorites {
  if (!raw) return { ...EMPTY_FAVORITES };
  try {
    return normalizeStoredFavorites(JSON.parse(raw));
  } catch {
    return { ...EMPTY_FAVORITES };
  }
}

function parseLegacyFavorites(key: string, raw: string | null): Pick<StoredFavorites, "productIds" | "lookIds"> {
  if (!raw) return { productIds: [], lookIds: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const ids = normalizeIds(parsed);
      return key.includes("look") ? { productIds: [], lookIds: ids } : { productIds: ids, lookIds: [] };
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as { productIds?: unknown; products?: unknown; lookIds?: unknown; looks?: unknown; items?: unknown };
      return {
        productIds: normalizeIds(record.productIds ?? record.products ?? (!key.includes("look") ? record.items : [])),
        lookIds: normalizeIds(record.lookIds ?? record.looks ?? (key.includes("look") ? record.items : [])),
      };
    }
  } catch {
    return { productIds: [], lookIds: [] };
  }
  return { productIds: [], lookIds: [] };
}

export function areStoredFavoritesEqual(left: StoredFavorites, right: StoredFavorites): boolean {
  return left.productIds.length === right.productIds.length
    && left.lookIds.length === right.lookIds.length
    && left.productIds.every((id, index) => id === right.productIds[index])
    && left.lookIds.every((id, index) => id === right.lookIds[index]);
}

export function readStoredFavorites(storage: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage): StoredFavorites {
  if (!storage) return { ...EMPTY_FAVORITES };
  const current = parseStoredFavorites(storage.getItem(FAVORITES_STORAGE_KEY));
  const legacy = LEGACY_FAVORITES_STORAGE_KEYS.reduce<StoredFavorites>((merged, key) => {
    const parsed = parseLegacyFavorites(key, storage.getItem(key));
    return {
      productIds: [...new Set([...merged.productIds, ...parsed.productIds])],
      lookIds: [...new Set([...merged.lookIds, ...parsed.lookIds])],
      updatedAt: merged.updatedAt,
    };
  }, current);

  if (!areStoredFavoritesEqual(current, legacy)) {
    writeStoredFavorites(legacy, storage);
    LEGACY_FAVORITES_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
  }

  return legacy;
}

export function writeStoredFavorites(next: StoredFavorites, storage: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage): boolean {
  if (!storage) return false;
  const normalized = normalizeStoredFavorites({ ...next, updatedAt: next.updatedAt || Date.now() });
  const current = parseStoredFavorites(storage.getItem(FAVORITES_STORAGE_KEY));
  if (areStoredFavoritesEqual(current, normalized)) return false;
  storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ ...normalized, updatedAt: Date.now() }));
  return true;
}

export function clearStoredFavorites(storage: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage) {
  storage?.removeItem(FAVORITES_STORAGE_KEY);
}
