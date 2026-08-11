"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import { useCart } from "@/context/cart";
import { buildCreateOrderRequest, OrderSubmissionError, resetCheckoutAttemptKey, submitOrderToApi, validateOrderFormFields, type OrderFormValues } from "@/lib/orders/client";
import type { DeliveryMode } from "@/types/order";
import { saveGuestOrderAccess } from "@/components/orders/orderAccessStorage";
import { waitForAuthHydration } from "@/components/orders/customerOrderAccess";

export function CheckoutForm() {
  function notifyDeliveryChange(event: ChangeEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    window.dispatchEvent(new CustomEvent("run213:delivery-change", { detail: { wilaya: String(formData.get("wilaya") ?? ""), deliveryMode: String(formData.get("deliveryType") ?? "home") } }));
  }
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleChange(event: ChangeEvent<HTMLFormElement>) {
    notifyDeliveryChange(event);
    const field = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement ? event.target.name : "";
    const key = field === "deliveryType" ? "deliveryMode" : field;
    if (key && fieldErrors[key]) setFieldErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  }

  function focusFirstError(form: HTMLFormElement, errors: Record<string, string>) {
    const first = Object.keys(errors)[0];
    const name = first === "deliveryMode" ? "deliveryType" : first;
    const control = form.elements.namedItem(name);
    if (control instanceof HTMLElement) control.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const values: OrderFormValues = {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      wilaya: String(formData.get("wilaya") ?? ""),
      deliveryMode: String(formData.get("deliveryType") ?? "home") as DeliveryMode,
      address: String(formData.get("address") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    };
    const validation = validateOrderFormFields(values, items);

    if (validation.message) {
      setFieldErrors(validation.fieldErrors);
      setMessage(Object.keys(validation.fieldErrors).length ? null : validation.message);
      focusFirstError(form, validation.fieldErrors);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setFieldErrors({});

    try {
      const user = await waitForAuthHydration();
      const idToken = user ? await user.getIdToken() : null;
      const order = await submitOrderToApi(buildCreateOrderRequest(values, items), idToken);
      if (order.customerAccessToken) saveGuestOrderAccess({ orderId: order.orderId, orderNumber: order.orderNumber, token: order.customerAccessToken });
      resetCheckoutAttemptKey();
      clearCart();
      router.push(`/orders/${encodeURIComponent(order.orderId)}?status=success`);
    } catch (error) {
      if (error instanceof OrderSubmissionError && Object.keys(error.fieldErrors).length) {
        setFieldErrors(error.fieldErrors);
        setMessage(null);
        focusFirstError(form, error.fieldErrors);
      } else setMessage(error instanceof Error ? error.message : "Could not create order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="checkoutForm checkoutForm--compact" action="#" onSubmit={handleSubmit} onChange={handleChange} noValidate>
      <section className="checkoutCard checkoutCard--compact" aria-labelledby="checkout-details-title">
        <div className="checkoutCard__heading">
          <h2 id="checkout-details-title">Delivery details</h2>
          <p>Cash on delivery. Delivery is calculated from your Wilaya and verified by the server.</p>
        </div>
        {Object.keys(fieldErrors).length ? <p className="deliveryValidationSummary" role="alert">Check the highlighted delivery details.</p> : null}

        <div className="checkoutFields checkoutFields--two">
          <label>
            <span>Full name</span>
            <input type="text" name="fullName" placeholder="Your full name" aria-invalid={Boolean(fieldErrors.fullName)} required />
            {fieldErrors.fullName ? <small className="fieldError">{fieldErrors.fullName}</small> : null}
          </label>
          <label>
            <span>Phone</span>
            <input type="tel" name="phone" placeholder="0550 00 00 00" aria-invalid={Boolean(fieldErrors.phone)} required />
            {fieldErrors.phone ? <small className="fieldError">{fieldErrors.phone}</small> : null}
          </label>
        </div>

        <div className="checkoutFields checkoutFields--two">
          <label>
            <span>Wilaya</span>
            <select name="wilaya" required defaultValue="" aria-invalid={Boolean(fieldErrors.wilaya)}>
              <option value="" disabled>Choose wilaya</option>
              {ALGERIA_WILAYAS.map((wilaya) => <option value={wilaya.name} key={wilaya.code}>{wilaya.label}</option>)}
            </select>
            {fieldErrors.wilaya ? <small className="fieldError">{fieldErrors.wilaya}</small> : null}
          </label>
          <fieldset className="checkoutDeliveryType checkoutDeliveryType--compact" aria-invalid={Boolean(fieldErrors.deliveryMode)}>
            <legend>Delivery mode</legend>
            <label>
              <input type="radio" name="deliveryType" value="home" defaultChecked />
              <span>Home</span>
            </label>
            {fieldErrors.deliveryMode ? <small className="fieldError">{fieldErrors.deliveryMode}</small> : null}
            <label>
              <input type="radio" name="deliveryType" value="desk" />
              <span>Desk</span>
            </label>
          </fieldset>
        </div>

        <label>
          <span>Address</span>
          <input type="text" name="address" placeholder="Street, building, floor" aria-invalid={Boolean(fieldErrors.address)} required />
          {fieldErrors.address ? <small className="fieldError">{fieldErrors.address}</small> : null}
        </label>

        <label>
          <span>Notes optional</span>
          <textarea name="notes" placeholder="Delivery note" rows={3} aria-invalid={Boolean(fieldErrors.notes)} />
          {fieldErrors.notes ? <small className="fieldError">{fieldErrors.notes}</small> : null}
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
