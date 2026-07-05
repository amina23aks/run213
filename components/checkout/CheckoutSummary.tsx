import Image from "next/image";
import { mockCartItems, mockCartSubtotal } from "@/components/cart/cartData";

export function CheckoutSummary() {
  const item = mockCartItems[0];

  return (
    <aside className="checkoutSummary" aria-label="Checkout order summary">
      <h2>ORDER SUMMARY</h2>
      <article className="checkoutSummaryItem">
        <div>
          <Image src={item.image} alt={`${item.name} checkout thumbnail`} width={160} height={200} />
        </div>
        <section>
          <h3>{item.name}</h3>
          <p>{item.color} / Size {item.size}</p>
          <span>Qty {item.quantity}</span>
        </section>
        <strong>{item.price}</strong>
      </article>
      <div className="checkoutSummaryRows">
        <p><span>Subtotal</span><strong>{mockCartSubtotal}</strong></p>
        <p><span>Delivery</span><strong>Calculated after confirmation</strong></p>
        <p className="checkoutSummaryTotal"><span>Total</span><strong>{mockCartSubtotal}</strong></p>
      </div>
      <p className="checkoutSummaryNote">Cash on delivery. We confirm delivery details before shipping.</p>
    </aside>
  );
}
