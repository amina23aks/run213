"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CartVariantDisplay } from "@/components/cart/CartVariantDisplay";
import { groupCartItems, getGroupSubtotal } from "@/components/cart/cartGrouping";
import { formatDzd } from "@/constants/products";
import { getShippingQuote } from "@/lib/orders/shipping";
import { useCart } from "@/context/cart";

export function CheckoutSummary() {
  const { items, isHydrated, subtotalDzd } = useCart();
  const [deliveryDzd, setDeliveryDzd] = useState<number | null>(null);

  useEffect(() => {
    function handleDeliveryChange(event: Event) {
      const detail = (event as CustomEvent<{ wilaya?: string; deliveryMode?: "home" | "desk" }>).detail;
      if (!detail?.wilaya || !detail.deliveryMode) { setDeliveryDzd(null); return; }
      try { setDeliveryDzd(getShippingQuote({ wilaya: detail.wilaya, deliveryMode: detail.deliveryMode }).amountDzd); }
      catch { setDeliveryDzd(null); }
    }
    window.addEventListener("run213:delivery-change", handleDeliveryChange);
    return () => window.removeEventListener("run213:delivery-change", handleDeliveryChange);
  }, []);

  const totalDzd = subtotalDzd + (deliveryDzd ?? 0);

  return (
    <aside className="checkoutSummary" aria-label="Checkout order summary">
      <h2>ORDER SUMMARY</h2>
      {isHydrated && items.length > 0 ? (
        groupCartItems(items).map((group) => {
          if (group.isLookGroup) {
            const firstItem = group.items[0];
            if (!firstItem) return null;
            return (
              <article className="checkoutSummaryLook" key={group.id}>
                <header>
                  <Image src={firstItem.lookImage ?? firstItem.image} alt={`${firstItem.lookName ?? "Look"} checkout thumbnail`} width={120} height={90} />
                  <div><span>LOOK</span><h3>{firstItem.lookName ?? "Selected Look"}</h3><strong>{formatDzd(getGroupSubtotal(group.items))}</strong></div>
                </header>
                <div>
                  {group.items.map((item) => <p key={`${item.productId}-${item.selectedSize ?? "no-size"}-${item.selectedColor ?? "no-color"}`}><span>{item.name} · {item.selectedColor ?? "Color"} / {item.selectedSize ?? "Size"} · Qty {item.quantity}</span></p>)}
                </div>
              </article>
            );
          }
          const item = group.items[0];
          if (!item) return null;
          return (
            <article className="checkoutSummaryItem" key={`${item.productId}-${item.selectedSize ?? "no-size"}-${item.selectedColor ?? "no-color"}`}>
              <div>
                <Image src={item.image} alt={`${item.name} checkout thumbnail`} width={160} height={200} />
              </div>
              <section>
                <h3>{item.name}</h3>
                <CartVariantDisplay item={item} />
                <span>Qty {item.quantity}</span>
              </section>
              <strong>{formatDzd(item.priceDzd * item.quantity)}</strong>
            </article>
          );
        })
      ) : (
        <div className="cartEmptyState">
          <p>Your cart is empty.</p>
          <span>Add DROP_001 pieces before checkout.</span>
          <Link href="/shop">SHOP DROP_001</Link>
        </div>
      )}
      <div className="checkoutSummaryRows">
        <p><span>Subtotal</span><strong>{formatDzd(subtotalDzd)}</strong></p>
        <p><span>Delivery</span><strong>{deliveryDzd === null ? "Choose Wilaya" : formatDzd(deliveryDzd)}</strong></p>
        <p className="checkoutSummaryTotal"><span>Total</span><strong>{formatDzd(totalDzd)}</strong></p>
      </div>
      <p className="checkoutSummaryNote">Cash on delivery. The server verifies product, Look, and delivery totals when the order is created.</p>
    </aside>
  );
}
