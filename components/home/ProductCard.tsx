"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/cart";
import type { Product } from "@/types/product";

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
  sourceProduct?: Product;
};

function getInitialColor(product?: Product): string | null {
  return product?.colors.length === 1 ? product.colors[0]?.name ?? null : null;
}

function getInitialSize(product?: Product): string | null {
  return product?.sizes.length === 1 ? product.sizes[0]?.label ?? null : null;
}

export function ProductCard({ product, promo = false, sourceProduct }: ProductCardProps) {
  const { addItem } = useCart();
  const [selectedColor, setSelectedColor] = useState<string | null>(() => getInitialColor(sourceProduct));
  const [selectedSize, setSelectedSize] = useState<string | null>(() => getInitialSize(sourceProduct));
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const requiresColorSelection = Boolean(sourceProduct && sourceProduct.colors.length > 1);
  const requiresSizeSelection = Boolean(sourceProduct && sourceProduct.sizes.length > 1);
  const isUnavailable = Boolean(sourceProduct && (!sourceProduct.inStock || sourceProduct.status !== "active" || (sourceProduct.stockMode === "limited" && (sourceProduct.stockQty ?? 0) <= 0)));

  function handleColorSelect(colorName: string) {
    setSelectedColor(colorName);
    setHelperMessage(null);
  }

  function handleSizeSelect(sizeLabel: string) {
    setSelectedSize(sizeLabel);
    setHelperMessage(null);
  }

  function handleAddToCart() {
    if (!sourceProduct) {
      setHelperMessage("Open the shop to choose this product.");
      return;
    }

    if (requiresColorSelection && !selectedColor) {
      setHelperMessage("Choose a color.");
      return;
    }

    if (requiresSizeSelection && !selectedSize) {
      setHelperMessage("Choose a size.");
      return;
    }

    const wasAdded = addItem({ product: sourceProduct, selectedColor, selectedSize, quantity: 1 });
    setHelperMessage(wasAdded ? "Added to cart." : "This product is unavailable.");
  }

  return (
    <article className="productCard">
      {sourceProduct ? <Link className="productCard__mainLink" href={`/product/${sourceProduct.slug}`} aria-label={`View ${product.name}`} /> : null}
      <div className="productImageWrap">
        {promo ? <span className="promoBadge">PROMO</span> : null}
        <button className="favoriteButton" type="button" aria-label={`Save ${product.name}`} aria-pressed="false" onClick={(event) => event.stopPropagation()}>
          <span aria-hidden="true">♡</span>
        </button>
        <Image src={product.image} alt={`${product.name} product image`} width={420} height={520} />
      </div>

      <div className="productInfo">
        <h3 className="productTitle">{product.name}</h3>
        <div className="productPriceRow">
          <span className="currentPrice">{product.price}</span>
          {product.oldPrice ? <span className="oldPrice">{product.oldPrice}</span> : null}
          {product.discount ? <span className="discountBadge">{product.discount}</span> : null}
        </div>

        <div className="swatchesRow" aria-label={`${product.name} colors`}>
          {sourceProduct ? sourceProduct.colors.map((color) => (
            <button
              className={color.name === selectedColor ? "productSwatch productSwatch--selected" : "productSwatch"}
              key={color.name}
              type="button"
              aria-label={`Select ${color.name}`}
              aria-pressed={color.name === selectedColor}
              onClick={(event) => { event.stopPropagation(); handleColorSelect(color.name); }}
            >
              <span className="productSwatch__color" style={{ backgroundColor: color.hex }} />
            </button>
          )) : product.colors.map((color, index) => (
            <span
              className={index === 0 ? "productSwatch productSwatch--selected" : "productSwatch"}
              key={color}
              aria-hidden="true"
            >
              <span className="productSwatch__color" style={{ backgroundColor: color }} />
            </span>
          ))}
        </div>

        <div className="productActions">
          {sourceProduct ? (
            sourceProduct.sizes.length ? (
              <div className="sizeChips" aria-label={`${product.name} sizes`}>
                {sourceProduct.sizes.map((size) => <button className={size.label === selectedSize ? "isSelected" : undefined} type="button" key={size.label} aria-pressed={size.label === selectedSize} onClick={(event) => { event.stopPropagation(); handleSizeSelect(size.label); }}>{size.label}</button>)}
              </div>
            ) : null
          ) : product.sizes ? (
            <div className="sizeChips" aria-label={`${product.name} sizes`}>
              {product.sizes.map((size) => <span key={size}>{size}</span>)}
            </div>
          ) : null}
          <div className="addButtonRow">
            <button className="addButton" type="button" aria-label={`Add ${product.name}`} disabled={isUnavailable} onClick={(event) => { event.stopPropagation(); handleAddToCart(); }}>+</button>
          </div>
          {helperMessage ? <p className="productCardHelper" role="status">{helperMessage}</p> : null}
        </div>
      </div>
    </article>
  );
}
