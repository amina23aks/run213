import { CategoryGrid } from "@/components/home/CategoryGrid";
import { DropPreview } from "@/components/home/DropPreview";
import { Hero } from "@/components/home/Hero";
import { PromoPicks } from "@/components/home/PromoPicks";
import { RunClub } from "@/components/home/RunClub";
import { ShopTheLook } from "@/components/home/ShopTheLook";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <DropPreview />
        <CategoryGrid />
        <ShopTheLook />
        <PromoPicks />
        <div className="club-footer-shell">
          <RunClub />
          <Footer />
        </div>
      </main>
    </>
  );
}
