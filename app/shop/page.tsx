import { ShopFilters } from "@/components/shop/ShopFilters";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { ShopHero } from "@/components/shop/ShopHero";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function ShopPage() {
  return (
    <>
      <Header />
      <main className="shopPage">
        <ShopHero />
        <ShopFilters />
        <ShopGrid />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
