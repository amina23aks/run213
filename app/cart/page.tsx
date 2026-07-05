import Link from "next/link";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { mockCartItems } from "@/components/cart/cartData";
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

        <section className="cartPage__layout" aria-label="Cart contents">
          <div className="cartPage__items">
            {mockCartItems.length > 0 ? (
              mockCartItems.map((item) => <CartItem item={item} key={item.id} />)
            ) : (
              <div className="cartEmptyState">
                <p>Your cart is empty.</p>
                <span>Start with DROP_001.</span>
                <Link href="/shop">SHOP DROP_001</Link>
              </div>
            )}
          </div>
          <CartSummary />
        </section>
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
