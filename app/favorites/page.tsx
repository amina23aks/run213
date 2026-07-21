import { FavoritesPageClient } from "@/components/favorites/FavoritesPageClient";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function FavoritesPage() {
  return (
    <>
      <Header />
      <main>
        <FavoritesPageClient />
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
