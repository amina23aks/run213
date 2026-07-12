import type { Product } from "@/types/product";

export type LookStatus = "draft" | "active" | "archived";

export type LookImage = {
  url: string;
  alt: string;
  publicId?: string;
};

export type LookCollection = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  cardImage: LookImage;
  status: LookStatus;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type Look = {
  id: string;
  collectionId: string;
  collectionSlug: string;
  slug: string;
  name: string;
  numberLabel: string | null;
  description: string;
  priceDzd: number;
  compareAtPriceDzd: number | null;
  heroImage: LookImage;
  figureImage?: LookImage | null;
  productIds: string[];
  status: LookStatus;
  sortOrder: number;
  showAsHomepageFigure: boolean;
  homepageFigureOrder: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LookWithProducts = Look & {
  products: Array<{ productId: string; product: Product | null }>;
};
