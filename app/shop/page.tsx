import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { ShopHero } from "@/components/shop/ShopHero";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { listActiveProducts } from "@/lib/firestore/products";

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<{ locked?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const [products, params] = await Promise.all([listActiveProducts(), searchParams]);
  const isLocked = params.locked === "1";

  return (
    <>
      <Header />
      <main className="shopPage">
        {isLocked ? null : <ShopHero />}
        <ShopBrowser products={products} />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
