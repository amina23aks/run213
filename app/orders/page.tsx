import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function OrdersPage() {
  return (
    <>
      <Header />
      <main className="accountPlaceholderPage">
        <section>
          <p>MY ORDERS</p>
          <h1>Orders are coming soon.</h1>
          <span>No fake order data is shown. Customer order history will connect to real orders in the orders sprint.</span>
        </section>
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
