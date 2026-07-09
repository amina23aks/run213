import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function FavoritesPage() {
  return (
    <>
      <Header />
      <main className="accountPlaceholderPage">
        <section>
          <p>FAVORITES</p>
          <h1>Favorites are coming soon.</h1>
          <span>No fake favorites are shown. Favorites will use real saved products in the favorites sprint.</span>
        </section>
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
