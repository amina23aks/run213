import type { ProductCategory, ProductStatus, ProductStockMode } from "@/types/product";

export type ProductDraftColor = {
  id: string;
  name: string;
  hex: string;
};

export type ProductDraftImage = {
  id: string;
  url: string;
};

export type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  priceDzd: string;
  compareAtPriceDzd: string;
  images: ProductDraftImage[];
  imageUrlDraft: string;
  colors: ProductDraftColor[];
  sizes: string[];
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
