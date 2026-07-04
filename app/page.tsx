import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { brandName, slogan } from "@/constants/brand";

const foundationProduct = {
  name: "Oversized Tee",
  price: "4,900 DZD",
  href: "/product/oversized-tee",
  imageSrc: "/placeholders/product-placeholder.webp",
  imageAlt: "213 RUN product placeholder",
  colors: ["#050505", "#f5f1e8", "#8a8a82"],
  sizes: ["S", "M", "L", "XL"],
};

export default function Home() {
  return (
    <div className="foundation-page">
      <Header />
      <main className="section" aria-labelledby="home-title">
        <div className="container foundation-demo">
          <section className="surface-card foundation-card">
            <SectionLabel eyebrow={brandName} title={slogan} copy="Sprint 1 UI foundation for the approved 213 RUN visual system." />
            <p>
              Premium minimal ecommerce foundation with cream light mode, charcoal dark mode, lime accents, and reusable layout/UI components.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/shop">Shop foundation</Button>
              <Button href="/run-club" variant="secondary">
                Run Club
              </Button>
            </div>
          </section>

          <section className="foundation-grid" aria-label="Foundation component examples">
            <ProductCard {...foundationProduct} badge="DROP_001" />
            <div className="surface-card foundation-card">
              <SectionLabel eyebrow="SYSTEM" title="UI BASICS" copy="Header, footer, buttons, labels, cards, focus states, responsive spacing, and reduced-motion support are ready." />
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
