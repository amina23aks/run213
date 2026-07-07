import { ShopFilters } from "@/components/shop/ShopFilters";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { ShopHero } from "@/components/shop/ShopHero";
import { ShopSearch } from "@/components/shop/ShopSearch";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { listActiveProducts } from "@/lib/firestore/products";

export default async function ShopPage() {
  const products = await listActiveProducts();

  return (
    <>
      <Header />
      <main className="shopPage">
        <ShopHero />
        <div className="shopControls">
          <ShopSearch />
          <ShopFilters />
        </div>
        <ShopGrid products={products} />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
