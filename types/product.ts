export type ProductCategory = "tshirts" | "pants" | "hoodies" | "accessories";

export type ProductStatus = "draft" | "active" | "archived";

export type ProductStockMode = "unlimited" | "limited" | "made_to_order";

export type ProductImage = {
  url: string;
  alt: string;
};

export type ProductColor = {
  name: string;
  hex: string;
};

export type ProductSize = {
  label: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string[];
  category: ProductCategory;
  status: ProductStatus;
  priceDzd: number;
  basePriceDzd?: number | null;
  compareAtPriceDzd: number | null;
  costPriceDzd?: number | null;
  discountPercent?: number;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: ProductSize[];
  stockMode: ProductStockMode;
  stockQty: number | null;
  inStock: boolean;
  featured: boolean;
  sizeGuideEnabled?: boolean;
  sizeGuideImageUrl?: string | null;
  sizeGuideImagePublicId?: string | null;
  isPromo: boolean;
  dropSlug: "drop-001" | null;
  sortOrder: number;
  showInDrop001: boolean;
  showInFeaturedDrop: boolean;
  showInShopTheLook: boolean;
  featuredSortOrder: number | null;
  lookGroupSlug: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ProductCardView = {
  name: string;
  price: string;
  image: string;
  colors: string[];
  sizes?: string[];
  oldPrice?: string;
  discount?: string;
};
