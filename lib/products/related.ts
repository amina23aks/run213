import { isProductInStock } from "@/lib/products/availability";
import type { Product, ProductCategory } from "@/types/product";

export const RELATED_PRODUCTS_LIMIT = 8;

const CATEGORY_RELEVANCE: Record<ProductCategory, ProductCategory[]> = {
  hoodies: ["hoodies", "pants", "tops", "tshirts", "accessories"],
  tops: ["tops", "pants", "hoodies", "tshirts", "accessories"],
  tshirts: ["tshirts", "pants", "hoodies", "tops", "accessories"],
  pants: ["pants", "tops", "tshirts", "hoodies", "accessories"],
  accessories: ["accessories", "hoodies", "tops", "tshirts", "pants"],
};

/** Ranks one already-loaded public catalog without issuing per-product reads. */
export function rankRelatedProducts(current: Product, catalog: Product[], limit = RELATED_PRODUCTS_LIMIT): Product[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const candidates = catalog.filter((candidate) => {
    if (candidate.id === current.id || candidate.slug === current.slug || candidate.status !== "active" || !isProductInStock(candidate) || !candidate.images.length || !candidate.colors.length) return false;
    if (seenIds.has(candidate.id) || seenSlugs.has(candidate.slug)) return false;
    seenIds.add(candidate.id);
    seenSlugs.add(candidate.slug);
    return true;
  });

  return candidates.sort((a, b) => {
    const categoryDifference = categoryRank(current.category, a.category) - categoryRank(current.category, b.category);
    if (categoryDifference) return categoryDifference;
    const lookDifference = merchandisingRank(current.lookGroupSlug, a.lookGroupSlug) - merchandisingRank(current.lookGroupSlug, b.lookGroupSlug);
    if (lookDifference) return lookDifference;
    const dropDifference = merchandisingRank(current.dropSlug, a.dropSlug) - merchandisingRank(current.dropSlug, b.dropSlug);
    return dropDifference || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug) || a.id.localeCompare(b.id);
  }).slice(0, Math.min(Math.max(Math.trunc(limit), 0), RELATED_PRODUCTS_LIMIT));
}

function categoryRank(currentCategory: ProductCategory, candidateCategory: ProductCategory): number {
  const rank = CATEGORY_RELEVANCE[currentCategory].indexOf(candidateCategory);
  return rank < 0 ? CATEGORY_RELEVANCE[currentCategory].length : rank;
}

function merchandisingRank(currentValue: string | null, candidateValue: string | null): number {
  return currentValue && candidateValue === currentValue ? 0 : 1;
}
