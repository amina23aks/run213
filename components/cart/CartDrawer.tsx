"use client";

import Link from "next/link";
import { CartItem } from "@/components/cart/CartItem";
import { formatDzd } from "@/constants/products";
import { useCart } from "@/context/cart";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, isHydrated, getLineKey, removeItem, updateQuantity, subtotalDzd } = useCart();
  const hasItems = isHydrated && items.length > 0;

  return (
    <div className={isOpen ? "cartDrawerShell is-open" : "cartDrawerShell"} aria-hidden={!isOpen}>
      <button className="cartDrawerOverlay" type="button" aria-label="Close cart" onClick={onClose} />
      <aside className="cartDrawer" aria-label="Cart drawer" aria-modal="true" role="dialog">
        <header className="cartDrawer__header">
          <h2>YOUR CART</h2>
          <button type="button" aria-label="Close cart" onClick={onClose}>×</button>
        </header>

        {hasItems ? (
          <>
            <div className="cartDrawer__items">
              {items.map((item) => {
                const lineKey = getLineKey(item);
                return <CartItem item={item} lineKey={lineKey} onRemove={removeItem} onUpdateQuantity={updateQuantity} key={lineKey} />;
              })}
            </div>
            <footer className="cartDrawer__footer">
              <p className="cartDrawer__subtotal"><span>Subtotal</span><strong>{formatDzd(subtotalDzd)}</strong></p>
              <p className="cartDrawer__note">Delivery calculated at checkout. Server totals will be recomputed in Sprint D.</p>
              <Link className="cartDrawer__checkout" href="/checkout" onClick={onClose}>CHECKOUT</Link>
              <Link className="cartDrawer__secondary" href="/shop" onClick={onClose}>CONTINUE SHOPPING</Link>
            </footer>
          </>
        ) : (
          <div className="cartDrawer__empty">
            <p>Your cart is empty.</p>
            <span>Start with DROP_001.</span>
            <Link href="/shop" onClick={onClose}>SHOP DROP_001</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
