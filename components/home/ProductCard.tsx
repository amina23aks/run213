"use client";

import Image from "next/image";
import Link from "next/link";
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

export function ProductCard({ product, promo = false, sourceProduct }: ProductCardProps) {
  const { addItem } = useCart();
  const hasRequiredVariants = Boolean(sourceProduct && (sourceProduct.colors.length > 0 || sourceProduct.sizes.length > 0));
  const canDirectAdd = Boolean(sourceProduct && !hasRequiredVariants);
  const productHref = sourceProduct ? `/product/${sourceProduct.slug}` : "/shop";

  function handleDirectAdd() {
    if (!sourceProduct || hasRequiredVariants) return;
    addItem({ product: sourceProduct, quantity: 1 });
  }

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

        <div className="productActions">
          {product.sizes ? (
            <div className="sizeChips" aria-label={`${product.name} sizes`}>
              {product.sizes.map((size) => <span key={size}>{size}</span>)}
            </div>
          ) : null}
          <div className="addButtonRow">
            {canDirectAdd ? (
              <button className="addButton" type="button" aria-label={`Add ${product.name}`} onClick={handleDirectAdd}>+</button>
            ) : (
              <Link className="addButton" href={productHref} aria-label={`Choose options for ${product.name}`}>+</Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
