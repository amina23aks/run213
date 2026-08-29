import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { ShopHero } from "@/components/shop/ShopHero";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { listActiveProducts, SHOP_CATALOG_LIMIT } from "@/lib/firestore/products";
import { listActiveLooks } from "@/lib/firestore/looks";
import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";

const shopMetadata = publicPageMetadata({ title: "Shop Streetwear", description: "Explore 213 RUN T-shirts, hoodies, pants, accessories and complete Looks made for comfortable everyday movement.", pathname: "/shop" });

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<{ locked?: string; mode?: string; category?: string; search?: string }>;
};

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const params = await searchParams;
  const isInternalSearch = Boolean(params.search);
  return { ...shopMetadata, ...(isInternalSearch ? { robots: { index: false, follow: true } } : {}) };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const isEnsemblesMode = params.mode === "ensembles";
  const [products, looks] = await Promise.all([
    isEnsemblesMode ? Promise.resolve([]) : listActiveProducts(SHOP_CATALOG_LIMIT),
    isEnsemblesMode ? listActiveLooks() : Promise.resolve([]),
  ]);
  const isLocked = params.locked === "1";

  return (
    <>
      <Header />
      <main className="shopPage">
        {isLocked ? null : <ShopHero />}
        <ShopBrowser products={products} looks={looks} />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
