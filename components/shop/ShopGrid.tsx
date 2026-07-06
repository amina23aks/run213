import { ProductCard } from "@/components/home/ProductCard";
import { shopProducts } from "@/constants/products";

export function ShopGrid() {
  return (
    <section className="shopProducts" aria-label="213 RUN products">
      <div className="shopGrid">
        {shopProducts.map((product) => (
          <ProductCard product={product} key={product.name} />
        ))}
      </div>
      <div className="shopLoadMore">
        <button type="button">LOAD MORE <span>→</span></button>
      </div>
    </section>
  );
}
