import { ShopFilters } from "@/components/shop/ShopFilters";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { ShopHero } from "@/components/shop/ShopHero";
import { ShopSearch } from "@/components/shop/ShopSearch";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function ShopPage() {
  return (
    <>
      <Header />
      <main className="shopPage">
        <ShopHero />
        <div className="shopControls">
          <ShopSearch />
          <ShopFilters />
        </div>
        <ShopGrid />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
