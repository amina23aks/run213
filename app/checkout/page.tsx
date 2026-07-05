import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="checkoutPage">
        <section className="checkoutPage__hero" aria-labelledby="checkout-title">
          <span className="section-number">CHECKOUT</span>
          <h1 id="checkout-title">CHECKOUT</h1>
          <p>Confirm your details. We’ll prepare your order.</p>
        </section>
        <section className="checkoutLayout" aria-label="Checkout details">
          <CheckoutForm />
          <CheckoutSummary />
        </section>
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
