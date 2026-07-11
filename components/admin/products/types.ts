import type { ProductCategory, ProductStatus, ProductStockMode } from "@/types/product";

export type ProductDraftColor = {
  id: string;
  name: string;
  hex: string;
};

export type ProductDraftImage = {
  id: string;
  url: string;
  publicId?: string;
  alt?: string;
};

export type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  basePriceDzd: string;
  priceDzd: string;
  discountPercent: string;
  costPriceDzd: string;
  compareAtPriceDzd: string;
  images: ProductDraftImage[];
  colors: ProductDraftColor[];
  sizes: string[];
  status: Exclude<ProductStatus, "archived">;
  stockMode: Extract<ProductStockMode, "unlimited" | "limited">;
  stockQty: string;
  isPromo: boolean;
  featured: boolean;
  sizeGuideEnabled: boolean;
  sizeGuideImageUrl: string;
  sizeGuideImagePublicId: string;
  dropSlug: "drop-001" | "";
  sortOrder: string;
  showInDrop001: boolean;
  showInFeaturedDrop: boolean;
  showInShopTheLook: boolean;
  featuredSortOrder: string;
  lookGroupSlug: string;
};
