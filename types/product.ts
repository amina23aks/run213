export type ProductCategory =
  | "tshirt-oversized"
  | "tshirt-regular"
  | "hoodie-zip"
  | "hoodie-balaclava"
  | "hoodie-winter"
  | "pants-open"
  | "pants-baggy"
  | "shorts-wide"
  | "bag-tote"
  | "bag-sport"
  | "hat"
  | "neck-warmer";

export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  dropSlug: string;
  price: number;
  sizes: Size[];
  stock: Record<Size, number>;
  images: string[];
  isActive: boolean;
  createdAt: number;
}
