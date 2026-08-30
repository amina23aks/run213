"use client";

import Link from "next/link";
import { CartItem } from "@/components/cart/CartItem";
import { CartLookGroup } from "@/components/cart/CartLookGroup";
import { groupCartItems } from "@/components/cart/cartGrouping";
import { CartSummary } from "@/components/cart/CartSummary";
import { useCart } from "@/context/cart";
import { useEffect, useRef } from "react";
import { cartAnalyticsItems, trackEvent } from "@/lib/analytics";

export function CartPageClient() {
  const { items, isHydrated, getLineKey, removeItem, removeLookGroup, updateQuantity, subtotalDzd, itemCount } = useCart();
  const hasItems = isHydrated && items.length > 0;
  const viewed = useRef(false);
  useEffect(() => { if (!viewed.current && isHydrated && items.length) { viewed.current = true; trackEvent("view_cart", { currency: "DZD", value: subtotalDzd, items: cartAnalyticsItems(items) }); } }, [isHydrated, items, subtotalDzd]);

  return (
    <section className="cartPage__layout" aria-label="Cart contents">
      <div className="cartPage__items">
        {hasItems ? (
          groupCartItems(items).map((group) => {
            if (group.isLookGroup) return <CartLookGroup items={group.items} subtotalDzd={group.customerSubtotalDzd} onRemoveGroup={removeLookGroup} key={group.id} />;
            const item = group.items[0];
            if (!item) return null;
            const lineKey = getLineKey(item);
            return <CartItem item={item} lineKey={lineKey} onRemove={removeItem} onUpdateQuantity={updateQuantity} key={lineKey} />;
          })
        ) : (
          <div className="cartEmptyState">
            <p>Your cart is empty.</p>
            <span>Start with DROP_001.</span>
            <Link href="/shop">SHOP DROP_001</Link>
          </div>
        )}
      </div>
      <CartSummary subtotalDzd={subtotalDzd} itemCount={itemCount} />
    </section>
  );
}
