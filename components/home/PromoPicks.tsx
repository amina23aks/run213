import { ProductCard } from "@/components/home/ProductCard";
import { toProductCardView } from "@/constants/products";
import { listActiveProductsByPlacement } from "@/lib/firestore/products";

export async function PromoPicks() {
  const products = await listActiveProductsByPlacement("showInFeaturedDrop", 6);

  return (
    <section className="home-section product-strip" id="promo-picks" aria-labelledby="promo-title">
      <aside className="section-intro">
        <h2 id="promo-title">FEATURED DROP</h2>
        <p>Selected pieces.<br />Limited time promo.</p>
        <a href="/shop">VIEW ALL <span>→</span></a>
      </aside>
      <div className="product-row product-row--promo" aria-label="Promo picks products">
        {products.map((product) => <ProductCard product={toProductCardView(product)} sourceProduct={product} promo={product.isPromo} key={product.id} />)}
      </div>
    </section>
  );
}
