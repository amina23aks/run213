import type { CartItem } from "@/types/cart";
import type { Product } from "@/types/product";

export type LookPriceResult = {
  isCompleteLook: boolean;
  originalItemCount: number;
  selectedItemCount: number;
  subtotalDzd: number;
  pricingMode: "look-price" | "remaining-products";
};

type PriceLine = {
  productId: string;
  priceDzd: number;
  quantity?: number;
};

type CalculateLookGroupPriceInput = {
  canonicalLookPriceDzd: number | null | undefined;
  originalProductIds: string[];
  selectedProductLines: PriceLine[];
  canonicalProducts?: Map<string, Pick<Product, "priceDzd">>;
};

export function isValidLookPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

export function calculateLookGroupPrice({ canonicalLookPriceDzd, originalProductIds, selectedProductLines, canonicalProducts }: CalculateLookGroupPriceInput): LookPriceResult {
  const originalIds = Array.from(new Set(originalProductIds.filter(Boolean)));
  const selectedIds = Array.from(new Set(selectedProductLines.map((line) => line.productId).filter(Boolean)));
  const originalIdSet = new Set(originalIds);
  const isCompleteLook = isValidLookPrice(canonicalLookPriceDzd) && originalIds.length > 0 && selectedIds.length === originalIds.length && originalIds.every((id) => selectedIds.includes(id));

  if (isCompleteLook) {
    return {
      isCompleteLook: true,
      originalItemCount: originalIds.length,
      selectedItemCount: selectedIds.length,
      subtotalDzd: canonicalLookPriceDzd,
      pricingMode: "look-price",
    };
  }

  const subtotalDzd = selectedProductLines.reduce((total, line) => {
    if (originalIdSet.size > 0 && !originalIdSet.has(line.productId)) return total;
    const canonicalPrice = canonicalProducts?.get(line.productId)?.priceDzd;
    const unitPrice = typeof canonicalPrice === "number" && Number.isFinite(canonicalPrice) ? canonicalPrice : line.priceDzd;
    return total + unitPrice * Math.max(1, Math.trunc(line.quantity ?? 1));
  }, 0);

  return {
    isCompleteLook: false,
    originalItemCount: originalIds.length,
    selectedItemCount: selectedIds.length,
    subtotalDzd,
    pricingMode: "remaining-products",
  };
}

export function parseLookOriginalProductIds(value: string[] | undefined, fallbackItems: Pick<CartItem, "productId">[]): string[] {
  const source = value && value.length ? value : fallbackItems.map((item) => item.productId);
  return Array.from(new Set(source.filter(Boolean)));
}
