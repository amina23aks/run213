"use client";

import Image from "next/image";
import Link from "next/link";
import { formatDzd } from "@/constants/products";
import { useCart } from "@/context/cart";

export function CheckoutSummary() {
  const { items, isHydrated, subtotalDzd } = useCart();

  return (
    <aside className="checkoutSummary" aria-label="Checkout order summary">
      <h2>ORDER SUMMARY</h2>
      {isHydrated && items.length > 0 ? (
        items.map((item) => {
          const optionText = [item.selectedColor, item.selectedSize ? `Size ${item.selectedSize}` : null].filter(Boolean).join(" / ");
          return (
            <article className="checkoutSummaryItem" key={`${item.productId}-${item.selectedSize ?? "no-size"}-${item.selectedColor ?? "no-color"}`}>
              <div>
                <Image src={item.image} alt={`${item.name} checkout thumbnail`} width={160} height={200} />
              </div>
              <section>
                <h3>{item.name}</h3>
                <p>{optionText || "Selected item"}</p>
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
        <p><span>Delivery</span><strong>Calculated after confirmation</strong></p>
        <p className="checkoutSummaryTotal"><span>Total</span><strong>{formatDzd(subtotalDzd)}</strong></p>
      </div>
      <p className="checkoutSummaryNote">Cash on delivery. Cart totals are client-side only; the server will recompute product and delivery totals in Sprint D.</p>
    </aside>
  );
}
