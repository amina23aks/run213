export type ProductCategory =
  | "Regular Tee"
  | "Oversized Tee"
  | "Regular Hoodie"
  | "Oversized Hoodie"
  | "Baggy Open Leg"
  | "Baggy Oversized Jogging";

export type ProductStatus = "draft" | "active" | "archived";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  priceDzd: number;
  status: ProductStatus;
};
