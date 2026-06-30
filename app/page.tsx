import { BrandPhilosophy } from "@/components/home/BrandPhilosophy";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { DropPreview } from "@/components/home/DropPreview";
import { Hero } from "@/components/home/Hero";
import { RunClub } from "@/components/home/RunClub";
import { ShopTheLook } from "@/components/home/ShopTheLook";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <DropPreview />
        <CategoryGrid />
        <ShopTheLook />
        <RunClub />
        <BrandPhilosophy />
      </main>
      <Footer />
    </>
  );
}
