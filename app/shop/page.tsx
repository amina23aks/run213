import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { ShopHero } from "@/components/shop/ShopHero";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { listActiveProducts } from "@/lib/firestore/products";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await listActiveProducts();

  return (
    <>
      <Header />
      <main className="shopPage">
        <ShopHero />
        <ShopBrowser products={products} />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
