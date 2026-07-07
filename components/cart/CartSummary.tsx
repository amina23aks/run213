import Link from "next/link";
import { formatDzd } from "@/constants/products";

type CartSummaryProps = {
  subtotalDzd: number;
  itemCount: number;
};

export function CartSummary({ subtotalDzd, itemCount }: CartSummaryProps) {
  return (
    <aside className="cartSummary" aria-label="Order summary">
      <h2>ORDER SUMMARY</h2>
      <div className="cartSummary__rows">
        <p><span>Items</span><strong>{itemCount}</strong></p>
        <p><span>Subtotal</span><strong>{formatDzd(subtotalDzd)}</strong></p>
        <p><span>Delivery</span><strong>Calculated later</strong></p>
        <p className="cartSummary__total"><span>Total</span><strong>{formatDzd(subtotalDzd)}</strong></p>
      </div>
      <Link className="cartSummary__checkout" href="/checkout">CHECKOUT</Link>
      <p>Cash on delivery available. Server totals will be recomputed during order creation in Sprint D.</p>
    </aside>
  );
}
