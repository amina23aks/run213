"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import { useCart } from "@/context/cart";
import { buildCreateOrderRequest, resetCheckoutAttemptKey, submitOrderToApi, validateOrderFormValues, type OrderFormValues } from "@/lib/orders/client";
import type { DeliveryMode } from "@/types/order";
import { saveGuestOrderAccess } from "@/components/orders/orderAccessStorage";
import { waitForAuthHydration } from "@/components/orders/customerOrderAccess";
import { loadProfile, saveProfile } from "@/lib/profile/client";
import type { CustomerProfile } from "@/types/profile";

export function CheckoutForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyFields = useRef(new Set<string>());
  const [saveDetails, setSaveDetails] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  function notifyDeliveryChange(event: ChangeEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    window.dispatchEvent(new CustomEvent("run213:delivery-change", { detail: { wilaya: String(formData.get("wilaya") ?? ""), deliveryMode: String(formData.get("deliveryType") ?? "home") } }));
  }
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    waitForAuthHydration().then(async (user) => {
      if (!active || !user) { setProfileReady(true); return; }
      try {
        const { defaults } = await loadProfile(user);
        const form = formRef.current;
        if (!form || !active) return;
        for (const field of ["fullName", "phone", "wilaya", "address", "notes"] as const) {
          const control = form.elements.namedItem(field) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
          if (control && !dirtyFields.current.has(field) && !control.value) control.value = defaults[field];
        }
        if (!dirtyFields.current.has("deliveryType") && defaults.deliveryMode === "desk") {
          const desk = form.querySelector<HTMLInputElement>('input[name="deliveryType"][value="desk"]');
          if (desk) desk.checked = true;
        }
        form.dispatchEvent(new Event("change", { bubbles: true }));
      } catch { /* Checkout remains usable when optional defaults cannot load. */ }
      finally { if (active) setProfileReady(true); }
    });
    return () => { active = false; };
  }, []);

  function handleChange(event: ChangeEvent<HTMLFormElement>) {
    const target = event.target as unknown as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (target.name && target.name !== "saveDetails") dirtyFields.current.add(target.name);
    notifyDeliveryChange(event);
  }

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
      const user = await waitForAuthHydration();
      const idToken = user ? await user.getIdToken() : null;
      if (user && saveDetails) await saveProfile(user, { fullName: values.fullName, phone: values.phone, wilaya: values.wilaya, address: values.address, deliveryMode: values.deliveryMode, notes: values.notes ?? "" } satisfies CustomerProfile);
      const order = await submitOrderToApi(buildCreateOrderRequest(values, items), idToken);
      if (order.customerAccessToken) saveGuestOrderAccess({ orderId: order.orderId, orderNumber: order.orderNumber, token: order.customerAccessToken });
      resetCheckoutAttemptKey();
      clearCart();
      router.push(`/orders/${encodeURIComponent(order.orderId)}?status=success`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className="checkoutForm checkoutForm--compact" action="#" onSubmit={handleSubmit} onChange={handleChange}>
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

        {profileReady ? <label className="checkoutSaveDetails"><input type="checkbox" name="saveDetails" checked={saveDetails} onChange={(event) => setSaveDetails(event.target.checked)} /><span>SAVE THESE DETAILS FOR NEXT TIME</span></label> : <p className="checkoutDefaultsLoading">Checking saved checkout details…</p>}

        {message ? <p className="checkoutFormMessage" role="status">{message}</p> : null}
        <button className="checkoutSubmit" type="submit" disabled={isSubmitting}>{isSubmitting ? "CREATING ORDER..." : "CONFIRM ORDER"}</button>
      </section>
    </form>
  );
}
