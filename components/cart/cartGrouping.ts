import type { CartItem } from "@/types/cart";

export type CartGroup = {
  id: string;
  isLookGroup: boolean;
  items: CartItem[];
};

export function groupCartItems(items: CartItem[]): CartGroup[] {
  const groups: CartGroup[] = [];
  const lookGroupIndexes = new Map<string, number>();

  items.forEach((item, index) => {
    if (!item.lookGroupId) {
      groups.push({ id: `single-${index}-${item.productId}`, isLookGroup: false, items: [item] });
      return;
    }

    const existingIndex = lookGroupIndexes.get(item.lookGroupId);
    if (typeof existingIndex === "number") {
      groups[existingIndex]?.items.push(item);
      return;
    }

    lookGroupIndexes.set(item.lookGroupId, groups.length);
    groups.push({ id: item.lookGroupId, isLookGroup: true, items: [item] });
  });

  return groups;
}

export function getGroupSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.priceDzd * item.quantity, 0);
}
