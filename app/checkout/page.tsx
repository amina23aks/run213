import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

type CheckoutPageProps = {
  searchParams: Promise<{ status?: string; orderNumber?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const isSuccess = params.status === "success" && Boolean(params.orderNumber);

  return (
    <>
      <Header />
      <main className="checkoutPage">
        <section className="checkoutPage__hero" aria-labelledby="checkout-title">
          <span className="section-number">CHECKOUT</span>
          <h1 id="checkout-title">CHECKOUT</h1>
          <p>Confirm your details. We’ll prepare your order.</p>
        </section>
        {isSuccess ? (
          <section className="checkoutSuccessState" aria-live="polite">
            <span>ORDER CREATED</span>
            <h2>{params.orderNumber}</h2>
            <p>Your pending cash-on-delivery order was created. We will confirm delivery details before shipping.</p>
          </section>
        ) : (
          <section className="checkoutLayout" aria-label="Checkout details">
            <CheckoutForm />
            <CheckoutSummary />
          </section>
        )}
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
