import { ProductCard } from "@/components/home/ProductCard";
import { toProductCardView } from "@/constants/products";
import type { Product } from "@/types/product";

type ShopGridProps = {
  products: Product[];
};

export function ShopGrid({ products }: ShopGridProps) {
  return (
    <section className="shopProducts" aria-label="213 RUN products">
      <div className="shopGrid">
        {products.map((product) => (
          <ProductCard product={toProductCardView(product)} sourceProduct={product} key={product.id} promo={product.isPromo} />
        ))}
      </div>
      <div className="shopLoadMore">
        <button type="button">LOAD MORE <span>→</span></button>
      </div>
    </section>
  );
}
