"use client";

import Image from "next/image";
import { useState } from "react";
import { formatDzd } from "@/constants/products";
import { useCart } from "@/context/cart";
import type { Product } from "@/types/product";

type ProductInfoProps = {
  product: Product;
};

export function ProductInfo({ product }: ProductInfoProps) {
  const { addItem } = useCart();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const maxQuantity = product.stockMode === "limited" && typeof product.stockQty === "number" ? product.stockQty : undefined;
  const isOutOfStock = !product.inStock || product.status !== "active" || (product.stockMode === "limited" && (product.stockQty ?? 0) <= 0);
  const requiresColor = product.colors.length > 0;
  const requiresSize = product.sizes.length > 0;

  function updateQuantity(nextQuantity: number) {
    const minClamped = Math.max(1, nextQuantity);
    setQuantity(typeof maxQuantity === "number" ? Math.min(minClamped, maxQuantity) : minClamped);
  }

  function handleColorSelect(colorName: string) {
    setSelectedColor(colorName);
    setCartMessage(null);
  }

  function handleSizeSelect(sizeLabel: string) {
    setSelectedSize(sizeLabel);
    setCartMessage(null);
  }

  function handleAddToCart() {
    if (requiresColor && !selectedColor) {
      setCartMessage("Choose a color before adding to cart.");
      return;
    }

    if (requiresSize && !selectedSize) {
      setCartMessage("Choose a size before adding to cart.");
      return;
    }

    const wasAdded = addItem({ product, selectedColor, selectedSize, quantity });
    setCartMessage(wasAdded ? "Added to cart." : "This product is currently unavailable.");
  }

  return (
    <aside className="productInfoPanel" aria-labelledby="product-title">
      <span className="productInfoPanel__label">DROP_001</span>
      <h1 id="product-title">{product.name.toUpperCase()}</h1>
      <p className="productInfoPanel__price">{formatDzd(product.priceDzd)}</p>
      <p className="productInfoPanel__description">{product.description}</p>

      {requiresColor ? (
        <div className="productOptionGroup">
          <div className="productOptionGroup__header">
            <span>Color</span>
            <strong>{selectedColor ?? "Choose color"}</strong>
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
                onClick={() => handleColorSelect(color.name)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {requiresSize ? (
        <div className="productOptionGroup">
          <div className="productOptionGroup__header">
            <span>Size</span>
            {product.sizeGuideEnabled && product.sizeGuideImageUrl ? <button className="productSizeGuideLink" type="button" onClick={() => setIsSizeGuideOpen(true)}>Size guide</button> : null}
          </div>
          <div className="productSizeOptions" aria-label="Size options">
            {product.sizes.map((size) => (
              <button className={size.label === selectedSize ? "is-active" : undefined} type="button" key={size.label} aria-pressed={size.label === selectedSize} onClick={() => handleSizeSelect(size.label)}>{size.label}</button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="productQuantity" aria-label="Quantity selector">
        <span>Quantity</span>
        <div>
          <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => updateQuantity(quantity - 1)}>−</button>
          <strong>{quantity}</strong>
          <button type="button" aria-label="Increase quantity" disabled={typeof maxQuantity === "number" && quantity >= maxQuantity} onClick={() => updateQuantity(quantity + 1)}>+</button>
        </div>
      </div>

      <div className="productActionsRow">
        <button className="productAddButton" type="button" disabled={isOutOfStock} onClick={handleAddToCart}>{isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}</button>
        <button className="productWishlistButton" type="button" aria-label="Add to wishlist">♡</button>
      </div>

      {cartMessage ? <p className="productDeliveryNote" role="status">{cartMessage}</p> : null}
      <p className="productDeliveryNote">Cash on delivery. Delivery details are confirmed at checkout later.</p>
      {isSizeGuideOpen && product.sizeGuideImageUrl ? (
        <div className="productSizeGuideModal" role="dialog" aria-modal="true" aria-label="Size guide">
          <div>
            <button type="button" aria-label="Close size guide" onClick={() => setIsSizeGuideOpen(false)}>×</button>
            <Image src={product.sizeGuideImageUrl} alt={`${product.name} size guide`} width={420} height={420} unoptimized />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
