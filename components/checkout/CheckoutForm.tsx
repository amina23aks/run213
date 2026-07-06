export function CheckoutForm() {
  return (
    <form className="checkoutForm" action="#">
      <section className="checkoutCard" aria-labelledby="customer-info-title">
        <h2 id="customer-info-title">Customer information</h2>
        <div className="checkoutFields checkoutFields--two">
          <label>
            <span>Full name</span>
            <input type="text" name="fullName" placeholder="Your full name" required />
          </label>
          <label>
            <span>Phone number</span>
            <input type="tel" name="phone" placeholder="0550 00 00 00" required />
          </label>
        </div>
        <label>
          <span>Email optional</span>
          <input type="email" name="email" placeholder="you@example.com" />
        </label>
      </section>

      <section className="checkoutCard" aria-labelledby="delivery-info-title">
        <h2 id="delivery-info-title">Delivery information</h2>
        <div className="checkoutFields checkoutFields--two">
          <label>
            <span>Wilaya</span>
            <input type="text" name="wilaya" placeholder="Algiers" required />
          </label>
          <label>
            <span>Commune</span>
            <input type="text" name="commune" placeholder="Commune" required />
          </label>
        </div>
        <label>
          <span>Address</span>
          <input type="text" name="address" placeholder="Street, building, floor" required />
        </label>
        <fieldset className="checkoutDeliveryType">
          <legend>Delivery type</legend>
          <label>
            <input type="radio" name="deliveryType" defaultChecked />
            <span>Home delivery</span>
          </label>
          <label>
            <input type="radio" name="deliveryType" />
            <span>Desk pickup</span>
          </label>
        </fieldset>
      </section>

      <section className="checkoutCard" aria-labelledby="order-note-title">
        <h2 id="order-note-title">Order note optional</h2>
        <label>
          <span>Notes for delivery</span>
          <textarea name="notes" placeholder="Anything we should know before delivery?" rows={4} />
        </label>
      </section>

      <section className="checkoutCard" aria-labelledby="payment-method-title">
        <h2 id="payment-method-title">Payment method</h2>
        <div className="checkoutPaymentMethod">
          <span>Cash on delivery</span>
          <strong>COD</strong>
        </div>
      </section>

      <button className="checkoutSubmit" type="button">PLACE ORDER</button>
    </form>
  );
}
