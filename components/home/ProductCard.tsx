import Image from "next/image";

type ProductCardItem = {
  name: string;
  price: string;
  image: string;
  colors: string[];
  sizes?: string[];
  oldPrice?: string;
  discount?: string;
};

type ProductCardProps = {
  product: ProductCardItem;
  href: string;
  promo?: boolean;
};

export function ProductCard({ product, href, promo = false }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-card__image-area">
        {promo ? <span className="product-card__promo-badge">PROMO</span> : null}
        <span className="product-card__heart" aria-hidden="true">♡</span>
        <Image src={product.image} alt={`${product.name} placeholder`} width={420} height={520} />
      </div>

      <div className="product-card__content">
        <h3>{product.name}</h3>
        <p className="product-card__price">
          <strong>{product.price}</strong>
          {product.oldPrice ? <s>{product.oldPrice}</s> : null}
          {product.discount ? <em>{product.discount}</em> : null}
        </p>

        <div className="product-card__colors" aria-label={`${product.name} colors`}>
          {product.colors.map((color, index) => (
            <span
              className={index === 0 ? "is-selected" : undefined}
              key={color}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="product-card__bottom-row">
          {product.sizes ? (
            <div className="product-card__sizes" aria-label={`${product.name} sizes`}>
              {product.sizes.map((size) => <span key={size}>{size}</span>)}
            </div>
          ) : <span aria-hidden="true" />}
          <a className="product-card__add" href={href} aria-label={`Add ${product.name}`}>+</a>
        </div>
      </div>
    </article>
  );
}
