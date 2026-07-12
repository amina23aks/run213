"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CartItem } from "@/components/cart/CartItem";
import { CartLookGroup } from "@/components/cart/CartLookGroup";
import { groupCartItems } from "@/components/cart/cartGrouping";
import { formatDzd } from "@/constants/products";
import { useCart } from "@/context/cart";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import { buildCreateOrderRequest, submitOrderToApi, validateOrderFormValues, type OrderFormValues } from "@/lib/orders/client";
import { getShippingQuote } from "@/lib/orders/shipping";
import type { DeliveryMode } from "@/types/order";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, isHydrated, getLineKey, removeItem, removeLookGroup, updateQuantity, subtotalDzd, itemCount, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [quickDeliveryDzd, setQuickDeliveryDzd] = useState<number | null>(null);
  const hasItems = isHydrated && items.length > 0;

  function updateQuickDelivery(event: ChangeEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const wilaya = String(formData.get("drawerWilaya") ?? "");
    const deliveryMode = String(formData.get("drawerDeliveryMode") ?? "home") as DeliveryMode;
    if (!wilaya) { setQuickDeliveryDzd(null); return; }
    try { setQuickDeliveryDzd(getShippingQuote({ wilaya, deliveryMode }).amountDzd); }
    catch { setQuickDeliveryDzd(null); }
  }

  async function handleQuickCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const values: OrderFormValues = {
      fullName: String(formData.get("drawerFullName") ?? ""),
      phone: String(formData.get("drawerPhone") ?? ""),
      wilaya: String(formData.get("drawerWilaya") ?? ""),
      deliveryMode: String(formData.get("drawerDeliveryMode") ?? "home") as DeliveryMode,
      address: String(formData.get("drawerAddress") ?? ""),
      notes: String(formData.get("drawerNotes") ?? ""),
    };
    const validationError = validateOrderFormValues(values, items);

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const order = await submitOrderToApi(buildCreateOrderRequest(values, items));
      clearCart();
      onClose();
      router.push(`/checkout?status=success&orderNumber=${encodeURIComponent(order.orderNumber)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
              {groupCartItems(items).map((group) => {
                if (group.isLookGroup) return <CartLookGroup items={group.items} subtotalDzd={group.customerSubtotalDzd} onRemoveGroup={removeLookGroup} key={group.id} />;
                const item = group.items[0];
                if (!item) return null;
                const lineKey = getLineKey(item);
                return <CartItem item={item} lineKey={lineKey} onRemove={removeItem} onUpdateQuantity={updateQuantity} key={lineKey} />;
              })}
            </div>
            <footer className="cartDrawer__footer">
              <div className="cartDrawerSubtotalBox">
                <p className="cartDrawer__summaryTitle"><span>{itemCount} ITEM{itemCount === 1 ? "" : "S"}</span><strong>TOTAL</strong></p>
                <p className="cartDrawer__subtotal"><span>Subtotal</span><strong>{formatDzd(subtotalDzd)}</strong></p>
                <p className="cartDrawer__subtotal"><span>Shipping</span><strong>Choose delivery method</strong></p>
                <p className="cartDrawer__subtotal"><span>Payment</span><strong>Cash on delivery</strong></p>
              </div>
              <Link className="cartDrawer__checkout" href="/checkout" onClick={onClose}>GO TO CHECKOUT PAGE</Link>

              <form className="drawerCheckoutForm" action="#" onSubmit={handleQuickCheckoutSubmit} onChange={updateQuickDelivery}>
                <div className="drawerCheckoutForm__header">
                  <strong>Quick checkout</strong>
                  <span>COD only</span>
                </div>
                <div className="drawerCheckoutForm__grid">
                  <label>
                    <span>Full name</span>
                    <input type="text" name="drawerFullName" placeholder="Your name" required />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input type="tel" name="drawerPhone" placeholder="0550 00 00 00" required />
                  </label>
                </div>
                <label>
                  <span>Wilaya</span>
                  <select name="drawerWilaya" defaultValue="" required>
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
                  <input type="text" name="drawerAddress" placeholder="Street, building, floor" required />
                </label>
                <label>
                  <span>Notes</span>
                  <textarea name="drawerNotes" placeholder="Optional delivery note" rows={2} />
                </label>
                {message ? <p className="checkoutFormMessage" role="status">{message}</p> : null}
                <div className="cartDrawerSubtotalBox cartDrawerSubtotalBox--quick">
                  <p className="cartDrawer__subtotal"><span>Subtotal</span><strong>{formatDzd(subtotalDzd)}</strong></p>
                  <p className="cartDrawer__subtotal"><span>Shipping</span><strong>{quickDeliveryDzd === null ? "Select wilaya" : formatDzd(quickDeliveryDzd)}</strong></p>
                  <p className="cartDrawer__subtotal cartDrawer__total"><span>Total</span><strong>{formatDzd(subtotalDzd + (quickDeliveryDzd ?? 0))}</strong></p>
                </div>
                <button className="cartDrawer__checkout" type="submit" disabled={isSubmitting}>{isSubmitting ? "CREATING ORDER..." : "CONFIRM ORDER"}</button>
              </form>
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
