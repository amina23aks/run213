import Link from "next/link";
import { mockCartSubtotal } from "@/components/cart/cartData";

export function CartSummary() {
  return (
    <aside className="cartSummary" aria-label="Order summary">
      <h2>ORDER SUMMARY</h2>
      <div className="cartSummary__rows">
        <p><span>Subtotal</span><strong>{mockCartSubtotal}</strong></p>
        <p><span>Delivery</span><strong>Calculated later</strong></p>
        <p className="cartSummary__total"><span>Total</span><strong>{mockCartSubtotal}</strong></p>
      </div>
      <Link className="cartSummary__checkout" href="/checkout">CHECKOUT</Link>
      <p>Cash on delivery available.</p>
    </aside>
  );
}
