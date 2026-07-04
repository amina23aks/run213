import Image from "next/image";
import { promoProducts } from "@/constants/home";

export function PromoPicks() {
  return (
    <section className="home-section product-strip" id="promo-picks" aria-labelledby="promo-title">
      <aside className="section-intro">
        <h2 id="promo-title">PROMO PICKS</h2>
        <p>Selected pieces.<br />Limited time promo.</p>
        <a href="#promo-picks">VIEW ALL <span>→</span></a>
      </aside>
      <div className="product-row product-row--promo" aria-label="Promo picks products">
        {promoProducts.map((product) => (
          <article className="product-card" key={product.name}>
            <mark>PROMO</mark>
            <span className="heart" aria-hidden="true">♡</span>
            <Image src="/tshirt.png" alt={`${product.name} promo placeholder`} width={420} height={520} />
            <h3>{product.name}</h3>
            <p><strong>{product.price}</strong> <s>{product.oldPrice}</s> <em>{product.discount}</em></p>
          </article>
        ))}
      </div>
    </section>
  );
}
