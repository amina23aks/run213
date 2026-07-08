import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";

export function CheckoutForm() {
  return (
    <form className="checkoutForm checkoutForm--compact" action="#">
      <section className="checkoutCard checkoutCard--compact" aria-labelledby="checkout-details-title">
        <div className="checkoutCard__heading">
          <h2 id="checkout-details-title">Delivery details</h2>
          <p>Cash on delivery. Order creation starts in Sprint D.</p>
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

        <button className="checkoutSubmit" type="button" disabled>CONFIRM ORDER — SPRINT D</button>
      </section>
    </form>
  );
}
