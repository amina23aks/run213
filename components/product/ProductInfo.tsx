import type { StaticProduct } from "@/constants/products";

type ProductInfoProps = {
  product: StaticProduct;
};

export function ProductInfo({ product }: ProductInfoProps) {
  return (
    <aside className="productInfoPanel" aria-labelledby="product-title">
      <span className="productInfoPanel__label">DROP_001</span>
      <h1 id="product-title">{product.name.toUpperCase()}</h1>
      <p className="productInfoPanel__price">{product.price}</p>
      <p className="productInfoPanel__description">{product.description ?? "Built for daily movement. Soft, structured, and made for the runners who show up."}</p>

      <div className="productOptionGroup">
        <div className="productOptionGroup__header">
          <span>Color</span>
          <strong>{product.colorNames[0]}</strong>
        </div>
        <div className="productColorDots" aria-label="Color options">
          {product.colors.map((color, index) => (
            <button className={index === 0 ? "is-active" : undefined} style={{ backgroundColor: color }} type="button" key={color} aria-label={product.colorNames[index] ?? "Color option"} />
          ))}
        </div>
      </div>

      {product.sizes ? (
        <div className="productOptionGroup">
          <div className="productOptionGroup__header">
            <span>Size</span>
            <a href="#product-fit">Size guide</a>
          </div>
          <div className="productSizeOptions" aria-label="Size options">
            {product.sizes.map((size, index) => (
              <button className={index === 1 ? "is-active" : undefined} type="button" key={size}>{size}</button>
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

      <button className="productAddButton" type="button">ADD TO CART</button>
      <button className="productWishlistButton" type="button">♡ Add to wishlist</button>
      <p className="productDeliveryNote">Cash on delivery. Delivery details are confirmed at checkout later.</p>
    </aside>
  );
}
