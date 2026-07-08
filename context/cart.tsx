"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CartItem } from "@/types/cart";
import type { Product } from "@/types/product";

export const CART_STORAGE_KEY = "213run-cart";

const MIN_QUANTITY = 1;

type AddToCartInput = {
  product: Product;
  selectedSize?: string | null;
  selectedColor?: string | null;
  quantity?: number;
};

type CartContextValue = {
  items: CartItem[];
  isHydrated: boolean;
  addItem: (input: AddToCartInput) => boolean;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  subtotalDzd: number;
  itemCount: number;
  getLineKey: (item: Pick<CartItem, "productId" | "selectedSize" | "selectedColor">) => string;
};

const CartContext = createContext<CartContextValue | null>(null);

function getLineKey(item: Pick<CartItem, "productId" | "selectedSize" | "selectedColor">): string {
  return [item.productId, item.selectedSize ?? "no-size", item.selectedColor ?? "no-color"].join("::");
}

function clampQuantity(quantity: number, maxQuantity?: number): number {
  const safeQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : MIN_QUANTITY;
  const minimumClamped = Math.max(MIN_QUANTITY, safeQuantity);
  return typeof maxQuantity === "number" ? Math.min(minimumClamped, Math.max(MIN_QUANTITY, maxQuantity)) : minimumClamped;
}

function getMaxQuantity(product: Product): number | undefined {
  if (product.stockMode === "limited" && typeof product.stockQty === "number") {
    return Math.max(0, product.stockQty);
  }

  return undefined;
}

function isProductAvailable(product: Product): boolean {
  if (product.status !== "active" || !product.inStock) return false;
  if (product.stockMode === "limited") return (product.stockQty ?? 0) > 0;
  return true;
}

function hasRequiredSelections(product: Product, selectedSize: string | null, selectedColor: string | null): boolean {
  if (product.colors.length > 0 && !selectedColor) return false;
  if (product.sizes.length > 0 && !selectedSize) return false;
  return true;
}

function normalizeStoredItems(value: string | null): CartItem[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): CartItem[] => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<CartItem>;
      if (
        typeof candidate.productId !== "string" ||
        typeof candidate.slug !== "string" ||
        typeof candidate.name !== "string" ||
        typeof candidate.priceDzd !== "number" ||
        typeof candidate.image !== "string" ||
        typeof candidate.quantity !== "number"
      ) {
        return [];
      }

      const maxQuantity = typeof candidate.maxQuantity === "number" ? candidate.maxQuantity : undefined;

      return [{
        productId: candidate.productId,
        slug: candidate.slug,
        name: candidate.name,
        priceDzd: candidate.priceDzd,
        image: candidate.image,
        selectedSize: typeof candidate.selectedSize === "string" ? candidate.selectedSize : null,
        selectedColor: typeof candidate.selectedColor === "string" ? candidate.selectedColor : null,
        quantity: clampQuantity(candidate.quantity, maxQuantity),
        ...(typeof maxQuantity === "number" ? { maxQuantity } : {}),
      }];
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      setItems(normalizeStoredItems(window.localStorage.getItem(CART_STORAGE_KEY)));
      setIsHydrated(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [isHydrated, items]);

  const addItem = useCallback((input: AddToCartInput) => {
    if (!isProductAvailable(input.product)) return false;

    const maxQuantity = getMaxQuantity(input.product);
    if (maxQuantity === 0) return false;

    const selectedSize = input.selectedSize ?? null;
    const selectedColor = input.selectedColor ?? null;
    if (!hasRequiredSelections(input.product, selectedSize, selectedColor)) return false;

    const quantity = clampQuantity(input.quantity ?? MIN_QUANTITY, maxQuantity);
    const lineKey = getLineKey({ productId: input.product.id, selectedSize, selectedColor });

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => getLineKey(item) === lineKey);
      if (!existingItem) {
        return [
          ...currentItems,
          {
            productId: input.product.id,
            slug: input.product.slug,
            name: input.product.name,
            priceDzd: input.product.priceDzd,
            image: input.product.images[0]?.url ?? "/placeholders/product-placeholder.webp",
            selectedSize,
            selectedColor,
            quantity,
            ...(typeof maxQuantity === "number" ? { maxQuantity } : {}),
          },
        ];
      }

      return currentItems.map((item) => (
        getLineKey(item) === lineKey
          ? { ...item, quantity: clampQuantity(item.quantity + quantity, item.maxQuantity) }
          : item
      ));
    });

    return true;
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setItems((currentItems) => currentItems.filter((item) => getLineKey(item) !== lineKey));
  }, []);

  const updateQuantity = useCallback((lineKey: string, quantity: number) => {
    setItems((currentItems) => currentItems.map((item) => (
      getLineKey(item) === lineKey ? { ...item, quantity: clampQuantity(quantity, item.maxQuantity) } : item
    )));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotalDzd = useMemo(() => items.reduce((total, item) => total + item.priceDzd * item.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    isHydrated,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    subtotalDzd,
    itemCount,
    getLineKey,
  }), [addItem, clearCart, isHydrated, itemCount, items, removeItem, subtotalDzd, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
