"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import { useCart } from "@/context/cart";
import { buildCreateOrderRequest, submitOrderToApi, validateOrderFormValues, type OrderFormValues } from "@/lib/orders/client";
import type { DeliveryMode } from "@/types/order";
import { saveGuestOrderAccess } from "@/components/orders/orderAccessStorage";

export function CheckoutForm() {
  function notifyDeliveryChange(event: ChangeEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    window.dispatchEvent(new CustomEvent("run213:delivery-change", { detail: { wilaya: String(formData.get("wilaya") ?? ""), deliveryMode: String(formData.get("deliveryType") ?? "home") } }));
  }
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const values: OrderFormValues = {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      wilaya: String(formData.get("wilaya") ?? ""),
      deliveryMode: String(formData.get("deliveryType") ?? "home") as DeliveryMode,
      address: String(formData.get("address") ?? ""),
      notes: String(formData.get("notes") ?? ""),
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
      if (order.customerAccessToken) saveGuestOrderAccess({ orderId: order.orderId, orderNumber: order.orderNumber, token: order.customerAccessToken });
      clearCart();
      router.push(`/order-success/${encodeURIComponent(order.orderId)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="checkoutForm checkoutForm--compact" action="#" onSubmit={handleSubmit} onChange={notifyDeliveryChange}>
      <section className="checkoutCard checkoutCard--compact" aria-labelledby="checkout-details-title">
        <div className="checkoutCard__heading">
          <h2 id="checkout-details-title">Delivery details</h2>
          <p>Cash on delivery. Delivery is calculated from your Wilaya and verified by the server.</p>
        </div>

        <div className="checkoutFields checkoutFields--two">
          <label>
            <span>Full name</span>
            <input type="text" name="fullName" placeholder="Your full name" required />
          </label>
          <label>
            <span>Phone</span>
            <input type="tel" name="phone" placeholder="0550 00 00 00" required />
          </label>
        </div>

        <div className="checkoutFields checkoutFields--two">
          <label>
            <span>Wilaya</span>
            <select name="wilaya" required defaultValue="">
              <option value="" disabled>Choose wilaya</option>
              {ALGERIA_WILAYAS.map((wilaya) => <option value={wilaya.name} key={wilaya.code}>{wilaya.label}</option>)}
            </select>
          </label>
          <fieldset className="checkoutDeliveryType checkoutDeliveryType--compact">
            <legend>Delivery mode</legend>
            <label>
              <input type="radio" name="deliveryType" value="home" defaultChecked />
              <span>Home</span>
            </label>
            <label>
              <input type="radio" name="deliveryType" value="desk" />
              <span>Desk</span>
            </label>
          </fieldset>
        </div>

        <label>
          <span>Address</span>
          <input type="text" name="address" placeholder="Street, building, floor" required />
        </label>

        <label>
          <span>Notes optional</span>
          <textarea name="notes" placeholder="Delivery note" rows={3} />
        </label>

        <div className="checkoutPaymentMethod">
          <span>Payment method</span>
          <strong>COD</strong>
        </div>

        {message ? <p className="checkoutFormMessage" role="status">{message}</p> : null}
        <button className="checkoutSubmit" type="submit" disabled={isSubmitting}>{isSubmitting ? "CREATING ORDER..." : "CONFIRM ORDER"}</button>
      </section>
    </form>
  );
}
