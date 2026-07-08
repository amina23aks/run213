"use client";

import Link from "next/link";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { useCart } from "@/context/cart";

export function CartPageClient() {
  const { items, isHydrated, getLineKey, removeItem, updateQuantity, subtotalDzd, itemCount } = useCart();
  const hasItems = isHydrated && items.length > 0;

  return (
    <section className="cartPage__layout" aria-label="Cart contents">
      <div className="cartPage__items">
        {hasItems ? (
          items.map((item) => {
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
