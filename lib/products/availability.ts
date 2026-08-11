import type { ProductStatus, ProductStockMode } from "@/types/product";

export type ProductAvailability = "in_stock" | "out_of_stock" | "unavailable";

type AvailabilityInput = {
  status: ProductStatus;
  stockMode: ProductStockMode;
  stockQty: number | null | undefined;
};

/** The single availability rule used by storefront, cart, favorites, and order code. */
export function getProductAvailability(product: AvailabilityInput): ProductAvailability {
  if (product.status !== "active") return "unavailable";
  if (product.stockMode === "limited") {
    return typeof product.stockQty === "number" && product.stockQty > 0 ? "in_stock" : "out_of_stock";
  }
  return "in_stock";
}

export function isProductInStock(product: AvailabilityInput): boolean {
  return getProductAvailability(product) === "in_stock";
}

export function canonicalInStock(stockMode: ProductStockMode, stockQty: number | null | undefined): boolean {
  return stockMode !== "limited" || (typeof stockQty === "number" && stockQty > 0);
}
