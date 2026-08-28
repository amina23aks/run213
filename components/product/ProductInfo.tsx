"use client";

import Image from "next/image";
import { useState } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { formatDzd } from "@/constants/products";
import { useCart } from "@/context/cart";
import type { Product } from "@/types/product";
import { isProductInStock } from "@/lib/products/availability";

type ProductInfoProps = {
  product: Product;
  onColorIdChange?: (colorId: string | null) => void;
};

export function ProductInfo({ product, onColorIdChange }: ProductInfoProps) {
  const { addItem } = useCart();
  const [selectedColorId, setSelectedColorId] = useState<string | null>(product.colors.length === 1 ? product.colors[0]?.id ?? null : null);
  const [selectedSize, setSelectedSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0]?.label ?? null : null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const maxQuantity = product.stockMode === "limited" && typeof product.stockQty === "number" ? product.stockQty : undefined;
  const isOutOfStock = !isProductInStock(product);
  const limitedStockQuantity = product.stockMode === "limited" && typeof product.stockQty === "number" ? product.stockQty : null;
  const isLowStock = limitedStockQuantity !== null && limitedStockQuantity > 0 && limitedStockQuantity < 5;
  const stockInfo = isOutOfStock
    ? "Out of stock"
    : isLowStock
      ? `Only ${limitedStockQuantity} left`
      : limitedStockQuantity !== null
        ? `Available: ${limitedStockQuantity}`
        : "In stock";
  const requiresColor = product.colors.length > 0;
  const requiresSize = product.sizes.length > 1;

  function updateQuantity(nextQuantity: number) {
    if (typeof maxQuantity === "number" && nextQuantity > maxQuantity) {
      setCartMessage(`Only ${maxQuantity} available.`);
      return;
    }
    const minClamped = Math.max(1, nextQuantity);
    setQuantity(typeof maxQuantity === "number" ? Math.min(minClamped, maxQuantity) : minClamped);
    setCartMessage(null);
  }

  function handleColorSelect(colorId: string) {
    setSelectedColorId(colorId);
    onColorIdChange?.(colorId);
    setCartMessage(null);
  }

  function handleSizeSelect(sizeLabel: string) {
    setSelectedSize(sizeLabel);
    setCartMessage(null);
  }

  function handleAddToCart() {
    if (typeof maxQuantity === "number" && quantity > maxQuantity) {
      setCartMessage(`Only ${maxQuantity} available.`);
      return;
    }
    if (requiresColor && !selectedColorId) {
      setCartMessage("Choose a color before adding to cart.");
      return;
    }

    if (requiresSize && !selectedSize) {
      setCartMessage("Choose a size before adding to cart.");
      return;
    }

    const wasAdded = addItem({ product, selectedColorId, selectedSize, quantity });
    setCartMessage(wasAdded ? "Added to cart." : typeof maxQuantity === "number" ? `Only ${maxQuantity} available.` : "This product is currently unavailable.");
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
            <strong>{product.colors.find((color) => color.id === selectedColorId)?.name ?? "Choose color"}</strong>
          </div>
          <div className="productColorDots" aria-label="Color options">
            {product.colors.map((color) => (
              <button
                className={color.id === selectedColorId ? "productSwatch productSwatch--selected" : "productSwatch"}
                type="button"
                key={color.id ?? color.name}
                aria-label={`Select ${color.name}`}
                aria-pressed={color.id === selectedColorId}
                onClick={() => handleColorSelect(color.id)}
              >
                <span className="productSwatch__color" style={{ backgroundColor: color.hex }} />
              </button>
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

      <p className={`productStockInfo${isLowStock ? " productStockInfo--low" : ""}${isOutOfStock ? " productStockInfo--out" : ""}`} role="status">
        <i aria-hidden="true" />
        {stockInfo}
      </p>

      <div className="productQuantity" aria-label="Quantity selector">
        <span className="productQuantity__label">Quantity</span>
        <div>
          <button type="button" aria-label="Decrease quantity" disabled={isOutOfStock || quantity <= 1} onClick={() => updateQuantity(quantity - 1)}>−</button>
          <strong>{quantity}</strong>
          <button type="button" aria-label="Increase quantity" disabled={isOutOfStock || (typeof maxQuantity === "number" && quantity >= maxQuantity)} onClick={() => updateQuantity(quantity + 1)}>+</button>
        </div>
      </div>

      <div className="productActionsRow">
        <button className="productAddButton" type="button" disabled={isOutOfStock} onClick={handleAddToCart}>{isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}</button>
        <FavoriteButton itemType="product" itemId={product.id} itemName={product.name} variant="detail" stopPropagation={false} />
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
