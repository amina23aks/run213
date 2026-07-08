"use client";

import Link from "next/link";
import { CartItem } from "@/components/cart/CartItem";
import { formatDzd } from "@/constants/products";
import { useCart } from "@/context/cart";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";

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
          <div className="cartDrawer__content">
            <div className="cartDrawer__items">
              {items.map((item) => {
                const lineKey = getLineKey(item);
                return <CartItem item={item} lineKey={lineKey} onRemove={removeItem} onUpdateQuantity={updateQuantity} key={lineKey} />;
              })}
            </div>
            <footer className="cartDrawer__footer">
              <div className="cartDrawerSubtotalBox">
                <p className="cartDrawer__subtotal"><span>Subtotal</span><strong>{formatDzd(subtotalDzd)}</strong></p>
                <p className="cartDrawer__note">Delivery and final totals are recalculated by the server in Sprint D.</p>
              </div>

              <form className="drawerCheckoutForm" action="#">
                <div className="drawerCheckoutForm__header">
                  <strong>Quick checkout</strong>
                  <span>COD only</span>
                </div>
                <div className="drawerCheckoutForm__grid">
                  <label>
                    <span>Full name</span>
                    <input type="text" name="drawerFullName" placeholder="Your name" />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input type="tel" name="drawerPhone" placeholder="0550 00 00 00" />
                  </label>
                </div>
                <label>
                  <span>Wilaya</span>
                  <select name="drawerWilaya" defaultValue="">
                    <option value="" disabled>Choose wilaya</option>
                    {ALGERIA_WILAYAS.map((wilaya) => <option value={wilaya.name} key={wilaya.code}>{wilaya.label}</option>)}
                  </select>
                </label>
                <fieldset className="drawerDeliveryMode">
                  <legend>Delivery mode</legend>
                  <label><input type="radio" name="drawerDeliveryMode" value="home" defaultChecked /><span>Home</span></label>
                  <label><input type="radio" name="drawerDeliveryMode" value="desk" /><span>Desk</span></label>
                </fieldset>
                <label>
                  <span>Address</span>
                  <input type="text" name="drawerAddress" placeholder="Street, building, floor" />
                </label>
                <label>
                  <span>Notes</span>
                  <textarea name="drawerNotes" placeholder="Optional delivery note" rows={2} />
                </label>
                <button className="cartDrawer__checkout" type="button" disabled>CONFIRM ORDER — SPRINT D</button>
              </form>
              <Link className="cartDrawer__secondary" href="/checkout" onClick={onClose}>FULL CHECKOUT PAGE</Link>
              <Link className="cartDrawer__secondary" href="/shop" onClick={onClose}>CONTINUE SHOPPING</Link>
            </footer>
          </div>
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
