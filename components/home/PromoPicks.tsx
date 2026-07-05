import { ProductCard } from "@/components/home/ProductCard";
import { promoProducts } from "@/constants/home";

export function PromoPicks() {
  return (
    <section className="home-section product-strip" id="promo-picks" aria-labelledby="promo-title">
      <aside className="section-intro">
        <h2 id="promo-title">FEATURED DROP</h2>
        <p>Selected pieces.<br />Limited time promo.</p>
        <a href="#promo-picks">VIEW ALL <span>→</span></a>
      </aside>
      <div className="product-row product-row--promo" aria-label="Promo picks products">
        {promoProducts.map((product) => <ProductCard product={product} href="#promo-picks" promo key={product.name} />)}
      </div>
    </section>
  );
}
