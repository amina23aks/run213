import type { ProductCategory, ProductStatus, ProductStockMode } from "@/types/product";

export type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  priceDzd: string;
  compareAtPriceDzd: string;
  imagesText: string;
  colorsText: string;
  sizesText: string;
  status: ProductStatus;
  inStock: boolean;
  stockMode: Extract<ProductStockMode, "unlimited" | "limited">;
  stockQty: string;
  isPromo: boolean;
  dropSlug: "drop-001" | "";
  sortOrder: string;
  showInDrop001: boolean;
  showInFeaturedDrop: boolean;
  showInShopTheLook: boolean;
  featuredSortOrder: string;
  lookGroupSlug: string;
};

export type ParsedColor = {
  name: string;
  hex: string;
};
