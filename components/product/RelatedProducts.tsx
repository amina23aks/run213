import { ProductCard } from "@/components/home/ProductCard";
import { relatedDropProducts, toProductCardView } from "@/constants/products";

export function RelatedProducts() {
  return (
    <section className="relatedProducts" aria-labelledby="related-products-title">
      <div className="relatedProducts__header">
        <span className="section-number">03</span>
        <h2 id="related-products-title">MORE FROM DROP_001</h2>
      </div>
      <div className="relatedProducts__grid">
        {relatedDropProducts.map((product) => (
          <ProductCard product={toProductCardView(product)} key={product.slug} promo={product.isPromo} />
        ))}
      </div>
    </section>
  );
}
