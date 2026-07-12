import { calculateLookGroupPrice, parseLookOriginalProductIds } from "@/lib/lookPricing";
import type { CartItem } from "@/types/cart";

export type CartGroup = {
  id: string;
  isLookGroup: boolean;
  items: CartItem[];
  customerSubtotalDzd: number;
  pricingMode?: "look-price" | "remaining-products";
  originalItemCount?: number;
  selectedItemCount?: number;
};

function priceLookGroup(items: CartItem[]): Pick<CartGroup, "customerSubtotalDzd" | "pricingMode" | "originalItemCount" | "selectedItemCount"> {
  const firstItem = items[0];
  const result = calculateLookGroupPrice({
    canonicalLookPriceDzd: firstItem?.lookPriceDzd,
    originalProductIds: parseLookOriginalProductIds(firstItem?.lookOriginalProductIds, items),
    selectedProductLines: items.map((item) => ({ productId: item.productId, priceDzd: item.priceDzd, quantity: item.quantity })),
  });

  return {
    customerSubtotalDzd: result.subtotalDzd,
    pricingMode: result.pricingMode,
    originalItemCount: result.originalItemCount,
    selectedItemCount: result.selectedItemCount,
  };
}

export function groupCartItems(items: CartItem[]): CartGroup[] {
  const groups: CartGroup[] = [];
  const lookGroupIndexes = new Map<string, number>();

  items.forEach((item, index) => {
    if (!item.lookGroupId) {
      groups.push({ id: `single-${index}-${item.productId}`, isLookGroup: false, items: [item], customerSubtotalDzd: item.priceDzd * item.quantity });
      return;
    }

    const existingIndex = lookGroupIndexes.get(item.lookGroupId);
    if (typeof existingIndex === "number") {
      groups[existingIndex]?.items.push(item);
      return;
    }

    lookGroupIndexes.set(item.lookGroupId, groups.length);
    groups.push({ id: item.lookGroupId, isLookGroup: true, items: [item], customerSubtotalDzd: 0 });
  });

  return groups.map((group) => group.isLookGroup ? { ...group, ...priceLookGroup(group.items) } : group);
}

export function groupCartItemsForPricing(items: CartItem[]): CartGroup[] {
  return groupCartItems(items);
}

export function calculateCustomerSubtotal(groups: CartGroup[]): number {
  return groups.reduce((total, group) => total + group.customerSubtotalDzd, 0);
}

export function getGroupSubtotal(items: CartItem[]): number {
  return priceLookGroup(items).customerSubtotalDzd;
}
