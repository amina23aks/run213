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
  promo?: boolean;
};

export function ProductCard({ product, promo = false }: ProductCardProps) {
  return (
    <article className="productCard">
      <div className="productImageWrap">
        {promo ? <span className="promoBadge">PROMO</span> : null}
        <button className="favoriteButton" type="button" aria-label={`Save ${product.name}`}>♡</button>
        <Image src={product.image} alt={`${product.name} placeholder`} width={420} height={520} />
      </div>

      <div className="productInfo">
        <h3 className="productTitle">{product.name}</h3>
        <div className="productPriceRow">
          <span className="currentPrice">{product.price}</span>
          {product.oldPrice ? <span className="oldPrice">{product.oldPrice}</span> : null}
          {product.discount ? <span className="discountBadge">{product.discount}</span> : null}
        </div>

        <div className="swatchesRow" aria-label={`${product.name} colors`}>
          {product.colors.map((color, index) => (
            <span
              className={index === 0 ? "isSelected" : undefined}
              key={color}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="productBottomRow">
          {product.sizes ? (
            <div className="sizeChips" aria-label={`${product.name} sizes`}>
              {product.sizes.map((size) => <span key={size}>{size}</span>)}
            </div>
          ) : <span aria-hidden="true" />}
          <button className="addButton" type="button" aria-label={`Add ${product.name}`}>+</button>
        </div>
      </div>
    </article>
  );
}
