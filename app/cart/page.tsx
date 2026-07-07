import { CartPageClient } from "@/components/cart/CartPageClient";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="cartPage">
        <section className="cartPage__header" aria-labelledby="cart-title">
          <span className="section-number">CART</span>
          <h1 id="cart-title">YOUR CART</h1>
          <p>Review your DROP_001 pieces before checkout.</p>
        </section>

        <CartPageClient />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
