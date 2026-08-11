import { getProductAvailability } from "@/lib/products/availability";
import type { Product } from "@/types/product";

export function StockBadge({ product }: { product: Pick<Product, "status" | "stockMode" | "stockQty"> }) {
  const availability = getProductAvailability(product);
  if (availability === "unavailable") return null;
  const inStock = availability === "in_stock";
  return <span className={`stockBadge stockBadge--${inStock ? "in" : "out"}`}><i aria-hidden="true" />{inStock ? "IN STOCK" : "OUT OF STOCK"}</span>;
}
