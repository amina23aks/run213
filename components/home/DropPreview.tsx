import Image from "next/image";
import { dropProducts } from "@/constants/home";

export function DropPreview() {
  return (
    <section className="home-section product-strip" id="drop-001" aria-labelledby="drop-title">
      <aside className="section-intro">
        <h2 id="drop-title">DROP_001</h2>
        <p>First drop ever.<br />Built for every run.<br />Made to move with you.</p>
        <a href="#drop-001">VIEW ALL PRODUCTS <span>→</span></a>
      </aside>
      <div className="product-row" aria-label="DROP_001 products">
        {dropProducts.map((product) => (
          <article className="product-card" key={product.name}>
            <span className="heart" aria-hidden="true">♡</span>
            <Image src={product.image} alt={`${product.name} placeholder`} width={420} height={520} />
            <h3>{product.name}</h3>
            <p className="product-card__price">{product.price}</p>
            <div className="product-card__colors" aria-label={`${product.name} colors`}>
              {product.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
            </div>
            <div className="product-card__sizes" aria-label={`${product.name} sizes`}>
              {product.sizes.map((size) => <span key={size}>{size}</span>)}
            </div>
            <a href="#drop-001" aria-label={`View ${product.name}`}>→</a>
          </article>
        ))}
      </div>
    </section>
  );
}
