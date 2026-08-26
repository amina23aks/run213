import { ProductCard } from "@/components/home/ProductCard";
import { toProductCardView } from "@/constants/products";
import { RELATED_PRODUCTS_LIMIT } from "@/lib/products/related";
import type { Product } from "@/types/product";

export function RelatedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <section className="relatedProducts" aria-labelledby="related-title">
      <div className="relatedProducts__header">
        <span>KEEP BUILDING</span>
        <h2 id="related-title">RELATED PRODUCTS</h2>
      </div>
      <div className="relatedProducts__grid">
        {products.slice(0, RELATED_PRODUCTS_LIMIT).map((product) => <ProductCard product={toProductCardView(product)} sourceProduct={product} key={product.id} promo={product.isPromo} />)}
      </div>
    </section>
  );
}
