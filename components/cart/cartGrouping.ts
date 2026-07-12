import type { CartItem } from "@/types/cart";

export type CartGroup = {
  id: string;
  isLookGroup: boolean;
  items: CartItem[];
  customerSubtotalDzd: number;
};

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
    groups.push({ id: item.lookGroupId, isLookGroup: true, items: [item], customerSubtotalDzd: item.lookPriceDzd ?? 0 });
  });

  return groups.map((group) => group.isLookGroup ? { ...group, customerSubtotalDzd: group.items[0]?.lookPriceDzd ?? 0 } : group);
}

export function groupCartItemsForPricing(items: CartItem[]): CartGroup[] {
  return groupCartItems(items);
}

export function calculateCustomerSubtotal(groups: CartGroup[]): number {
  return groups.reduce((total, group) => total + group.customerSubtotalDzd, 0);
}

export function getGroupSubtotal(items: CartItem[]): number {
  return items[0]?.lookPriceDzd ?? items.reduce((total, item) => total + item.priceDzd * item.quantity, 0);
}
