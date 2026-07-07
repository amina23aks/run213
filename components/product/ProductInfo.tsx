"use client";

import { useMemo, useState } from "react";
import { formatDzd } from "@/constants/products";
import { useCart } from "@/context/cart";
import type { Product } from "@/types/product";

type ProductInfoProps = {
  product: Product;
};

export function ProductInfo({ product }: ProductInfoProps) {
  const { addItem } = useCart();
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name ?? null);
  const [selectedSize, setSelectedSize] = useState(product.sizes[1]?.label ?? product.sizes[0]?.label ?? null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const maxQuantity = product.stockMode === "limited" && typeof product.stockQty === "number" ? product.stockQty : undefined;
  const isOutOfStock = !product.inStock || product.status !== "active" || (product.stockMode === "limited" && (product.stockQty ?? 0) <= 0);

  const selectedColorHex = useMemo(() => product.colors.find((color) => color.name === selectedColor)?.hex, [product.colors, selectedColor]);

  function updateQuantity(nextQuantity: number) {
    const minClamped = Math.max(1, nextQuantity);
    setQuantity(typeof maxQuantity === "number" ? Math.min(minClamped, maxQuantity) : minClamped);
  }

  function handleAddToCart() {
    const wasAdded = addItem({ product, selectedColor, selectedSize, quantity });
    setCartMessage(wasAdded ? "Added to cart." : "This product is currently unavailable.");
  }

  return (
    <aside className="productInfoPanel" aria-labelledby="product-title">
      <span className="productInfoPanel__label">DROP_001</span>
      <h1 id="product-title">{product.name.toUpperCase()}</h1>
      <p className="productInfoPanel__price">{formatDzd(product.priceDzd)}</p>
      <p className="productInfoPanel__description">{product.description}</p>

      <div className="productOptionGroup">
        <div className="productOptionGroup__header">
          <span>Color</span>
          <strong>{selectedColor ?? "Color"}</strong>
        </div>
        <div className="productColorDots" aria-label="Color options">
          {product.colors.map((color) => (
            <button
              className={color.name === selectedColor ? "is-active" : undefined}
              style={{ backgroundColor: color.hex }}
              type="button"
              key={color.name}
              aria-label={color.name}
              aria-pressed={color.name === selectedColor}
              onClick={() => setSelectedColor(color.name)}
            />
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
            {product.sizes.map((size) => (
              <button className={size.label === selectedSize ? "is-active" : undefined} type="button" key={size.label} aria-pressed={size.label === selectedSize} onClick={() => setSelectedSize(size.label)}>{size.label}</button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="productQuantity" aria-label="Quantity selector">
        <span>Quantity</span>
        <div>
          <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(quantity - 1)}>−</button>
          <strong>{quantity}</strong>
          <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(quantity + 1)}>+</button>
        </div>
      </div>

      <div className="productActionsRow">
        <button className="productAddButton" type="button" disabled={isOutOfStock} onClick={handleAddToCart}>{isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}</button>
        <button className="productWishlistButton" type="button" aria-label="Add to wishlist">♡</button>
      </div>

      {cartMessage ? <p className="productDeliveryNote" role="status">{cartMessage}</p> : null}
      <p className="productDeliveryNote">{selectedColorHex ? "Selected color shown above. " : ""}Cash on delivery. Delivery details are confirmed at checkout later.</p>
    </aside>
  );
}
