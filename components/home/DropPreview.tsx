import { ProductCard } from "@/components/home/ProductCard";
import { listActiveProductsByPlacement } from "@/lib/firestore/products";
import { toProductCardView } from "@/constants/products";

export async function DropPreview() {
  const products = await listActiveProductsByPlacement("showInDrop001", 5);

  return (
    <section className="home-section product-strip" id="drop-001" aria-labelledby="drop-title">
      <aside className="section-intro">
        <h2 id="drop-title">DROP_001</h2>
        <p>First drop ever.<br />Built for every run.<br />Made to move with you.</p>
        <a href="/shop">VIEW ALL PRODUCTS <span>→</span></a>
      </aside>
      <div className="product-row" aria-label="DROP_001 products">
        {products.map((product) => <ProductCard product={toProductCardView(product)} sourceProduct={product} key={product.id} />)}
      </div>
    </section>
  );
}
