import type { Product } from "./product";

export interface EnsembleItem {
  productId: string;
  product?: Product;
}

export interface Ensemble {
  id: string;
  slug: string;
  name: string;
  dropSlug: string;
  items: EnsembleItem[];
  heroImage: string;
  isActive: boolean;
  createdAt: number;
}
