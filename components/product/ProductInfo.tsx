import { formatDzd } from "@/constants/products";
import type { Product } from "@/types/product";

type ProductInfoProps = {
  product: Product;
};

export function ProductInfo({ product }: ProductInfoProps) {
  return (
    <aside className="productInfoPanel" aria-labelledby="product-title">
      <span className="productInfoPanel__label">DROP_001</span>
      <h1 id="product-title">{product.name.toUpperCase()}</h1>
      <p className="productInfoPanel__price">{formatDzd(product.priceDzd)}</p>
      <p className="productInfoPanel__description">{product.description}</p>

      <div className="productOptionGroup">
        <div className="productOptionGroup__header">
          <span>Color</span>
          <strong>{product.colors[0]?.name ?? "Color"}</strong>
        </div>
        <div className="productColorDots" aria-label="Color options">
          {product.colors.map((color, index) => (
            <button className={index === 0 ? "is-active" : undefined} style={{ backgroundColor: color.hex }} type="button" key={color.name} aria-label={color.name} />
          ))}
        </div>
      </div>

      {product.sizes.length ? (
        <div className="productOptionGroup">
          <div className="productOptionGroup__header">
            <span>Size</span>
            <a href="#">Size guide</a>
          </div>
          <div className="productSizeOptions" aria-label="Size options">
            {product.sizes.map((size, index) => (
              <button className={index === 1 ? "is-active" : undefined} type="button" key={size.label}>{size.label}</button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="productQuantity" aria-label="Quantity selector visual only">
        <span>Quantity</span>
        <div>
          <button type="button" aria-label="Decrease quantity">−</button>
          <strong>1</strong>
          <button type="button" aria-label="Increase quantity">+</button>
        </div>
      </div>

      <div className="productActionsRow">
        <button className="productAddButton" type="button">ADD TO CART</button>
        <button className="productWishlistButton" type="button" aria-label="Add to wishlist">♡</button>
      </div>

      <p className="productDeliveryNote">Cash on delivery. Delivery details are confirmed at checkout later.</p>
    </aside>
  );
}
