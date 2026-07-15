import type { ProductCategory } from "@/types/product";

export type ShopCategoryFilter = ProductCategory | "all";
export type ShopCategoryGroup = "tops" | "bottoms" | "accessories";

export const SHOP_CATEGORY_FILTERS: { label: string; value: ShopCategoryFilter }[] = [
  { label: "ALL PRODUCTS", value: "all" },
  { label: "T-SHIRTS", value: "tshirts" },
  { label: "PANTS", value: "pants" },
  { label: "HOODIES", value: "hoodies" },
  { label: "ACCESSORIES", value: "accessories" },
];

export const SHOP_CATEGORY_GROUPS: Record<ShopCategoryGroup, ProductCategory[]> = {
  tops: ["tshirts", "hoodies"],
  bottoms: ["pants"],
  accessories: ["accessories"],
};

export const SHOP_CATEGORY_CARD_HREFS: Record<string, string> = {
  TOPS: "/shop?group=tops&locked=1",
  BOTTOMS: "/shop?group=bottoms&locked=1",
  ACCESSORIES: "/shop?category=accessories&locked=1",
};

export function isShopCategoryFilter(value: string | null): value is ShopCategoryFilter {
  return value === "all" || SHOP_CATEGORY_FILTERS.some((filter) => filter.value === value);
}

export function isShopCategoryGroup(value: string | null): value is ShopCategoryGroup {
  return value === "tops" || value === "bottoms" || value === "accessories";
}

export function getShopCategoryHref(category: string): string {
  return SHOP_CATEGORY_CARD_HREFS[category] ?? "/shop";
}
