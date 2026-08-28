"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { useCart } from "@/context/cart";
import type { Product } from "@/types/product";
import { isProductInStock } from "@/lib/products/availability";
import { StockBadge } from "@/components/product/StockBadge";
import { CLOUDINARY_IMAGE_WIDTHS, cloudinaryImageUrl } from "@/lib/cloudinary-delivery";
import { FallbackImage } from "@/components/ui/FallbackImage";
import type { ProductImage } from "@/types/product";

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

function getInitialColorId(product?: Product): string | null {
  return product?.colors.length === 1 ? product.colors[0]?.id ?? null : null;
}

function getInitialSize(product?: Product): string | null {
  return product?.sizes.length === 1 ? product.sizes[0]?.label ?? null : null;
}

export function isLightProductColor(hex: string): boolean {
  const value = hex.trim().replace(/^#/, "");
  const expanded = value.length === 3 ? value.split("").map((character) => character + character).join("") : value;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return false;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255 >= 0.78;
}

/** Keeps card imagery on the canonical image/color relationship used by product data. */
export function getProductCardImages(product: Product | undefined, selectedColorId: string | null): { primary: ProductImage | null; hover: ProductImage | null } {
  if (!product) return { primary: null, hover: null };
  const images = product.images.filter((image) => image.url.trim());
  const canonicalPrimary = images.find((image) => image.isPrimary) ?? images[0] ?? null;
  const colorImages = selectedColorId ? images.filter((image) => image.colorId === selectedColorId) : [];
  const primary = selectedColorId ? colorImages[0] ?? canonicalPrimary : canonicalPrimary;
  if (!primary) return { primary: null, hover: null };
  const distinctImages = images.filter((image) => image.id !== primary.id && image.url !== primary.url);
  const sameColorHover = primary.colorId ? distinctImages.find((image) => image.colorId === primary.colorId) : null;
  const hover = sameColorHover ?? distinctImages[0] ?? null;
  return { primary, hover };
}

const CARD_IMAGE_SIZES = "(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 280px";
const CARD_IMAGE_TRANSITION_MS = 240;

function ProductCardImages({ normalSrc, hoverSrc, alt }: { normalSrc: string; hoverSrc: string | null; alt: string }) {
  const [displayedSrc, setDisplayedSrc] = useState(normalSrc);
  const [requestedSrc, setRequestedSrc] = useState(normalSrc);
  const [transitionSrc, setTransitionSrc] = useState<string | null>(null);
  const [transitionReady, setTransitionReady] = useState(false);
  const [loadedHoverSrc, setLoadedHoverSrc] = useState<string | null>(null);

  if (normalSrc !== requestedSrc) {
    setRequestedSrc(normalSrc);
    setTransitionReady(false);
    setTransitionSrc(normalSrc);
  }

  useEffect(() => {
    if (!transitionReady || !transitionSrc) return;
    const nextSrc = transitionSrc;
    const timer = window.setTimeout(() => {
      setDisplayedSrc(nextSrc);
      setTransitionSrc(null);
      setTransitionReady(false);
    }, CARD_IMAGE_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [transitionReady, transitionSrc]);

  return (
    <>
      <FallbackImage className="productCard__primaryImage" src={displayedSrc} fallbackSrc="/placeholders/product-placeholder.webp" alt={alt} width={420} height={520} sizes={CARD_IMAGE_SIZES} unoptimized />
      {transitionSrc ? <Image className={transitionReady ? "productCard__selectedImage is-loaded" : "productCard__selectedImage"} src={transitionSrc} alt="" aria-hidden="true" width={420} height={520} sizes={CARD_IMAGE_SIZES} onLoad={(event) => { if (event.currentTarget.naturalWidth > 0) setTransitionReady(true); }} onError={() => { setTransitionSrc(null); setTransitionReady(false); }} unoptimized /> : null}
      {hoverSrc ? <Image className={loadedHoverSrc === hoverSrc ? "productCard__hoverImage is-loaded" : "productCard__hoverImage"} src={hoverSrc} alt="" aria-hidden="true" width={420} height={520} sizes={CARD_IMAGE_SIZES} loading="lazy" onLoad={(event) => { if (event.currentTarget.naturalWidth > 0) setLoadedHoverSrc(hoverSrc); }} onError={() => { if (loadedHoverSrc === hoverSrc) setLoadedHoverSrc(null); }} unoptimized /> : null}
    </>
  );
}

export function ProductCard({ product, promo = false, sourceProduct }: ProductCardProps) {
  const { addItem } = useCart();
  const [selectedColorId, setSelectedColorId] = useState<string | null>(() => getInitialColorId(sourceProduct));
  const [selectedSize, setSelectedSize] = useState<string | null>(() => getInitialSize(sourceProduct));
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const requiresColorSelection = Boolean(sourceProduct && sourceProduct.colors.length > 1);
  const requiresSizeSelection = Boolean(sourceProduct && sourceProduct.sizes.length > 1);
  const isUnavailable = Boolean(sourceProduct && !isProductInStock(sourceProduct));
  const cardImages = getProductCardImages(sourceProduct, selectedColorId);
  const primaryImageUrl = cardImages.primary?.url ?? product.image;
  const normalImageSrc = cloudinaryImageUrl(primaryImageUrl, { width: CLOUDINARY_IMAGE_WIDTHS.productCard });
  const hoverImageSrc = cardImages.hover ? cloudinaryImageUrl(cardImages.hover.url, { width: CLOUDINARY_IMAGE_WIDTHS.productCard }) : null;

  function handleColorSelect(colorId: string) {
    setSelectedColorId(colorId);
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

    if (requiresColorSelection && !selectedColorId) {
      setHelperMessage("Choose a color.");
      return;
    }

    if (requiresSizeSelection && !selectedSize) {
      setHelperMessage("Choose a size.");
      return;
    }

    const wasAdded = addItem({ product: sourceProduct, selectedColorId, selectedSize, quantity: 1 });
    setHelperMessage(wasAdded ? "Added to cart." : "This product is unavailable.");
  }

  return (
    <article className="productCard">
      <div className="productCard__media productImageWrap">
        {promo ? <span className="promoBadge">PROMO</span> : null}
        {sourceProduct ? <StockBadge product={sourceProduct} /> : null}
        {sourceProduct ? (
          <Link className="productCard__mediaLink" href={`/product/${sourceProduct.slug}`} aria-label={`View ${product.name}`}>
            <ProductCardImages normalSrc={normalImageSrc} hoverSrc={hoverImageSrc} alt={cardImages.primary?.alt || `${product.name} product image`} />
          </Link>
        ) : <FallbackImage src={cloudinaryImageUrl(product.image, { width: CLOUDINARY_IMAGE_WIDTHS.productCard })} fallbackSrc="/placeholders/product-placeholder.webp" alt={`${product.name} product image`} width={420} height={520} sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 280px" unoptimized />}
        {sourceProduct ? <FavoriteButton className="productCard__favorite" itemType="product" itemId={sourceProduct.id} itemName={product.name} variant="card" /> : null}
      </div>

      <div className="productCard__content productInfo">
        <h3 className="productTitle">{sourceProduct ? <Link href={`/product/${sourceProduct.slug}`}>{product.name}</Link> : product.name}</h3>
        <div className="productPriceRow">
          <span className="currentPrice">{product.price}</span>
          {product.oldPrice ? <span className="oldPrice">{product.oldPrice}</span> : null}
          {product.discount ? <span className="discountBadge">{product.discount}</span> : null}
        </div>

        <div className="swatchesRow" aria-label={`${product.name} colors`}>
          {sourceProduct ? sourceProduct.colors.map((color) => (
            <button
              className={color.id === selectedColorId ? "productSwatch productSwatch--selected" : "productSwatch"}
              key={color.id ?? color.name}
              type="button"
              aria-label={`Select ${color.name}`}
              aria-pressed={color.id === selectedColorId}
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleColorSelect(color.id); }}
            >
              <span className={isLightProductColor(color.hex) ? "productSwatch__color productSwatch__color--light" : "productSwatch__color"} style={{ backgroundColor: color.hex }} />
            </button>
          )) : product.colors.map((color, index) => (
            <span
              className={index === 0 ? "productSwatch productSwatch--selected" : "productSwatch"}
              key={color}
              aria-hidden="true"
            >
              <span className={isLightProductColor(color) ? "productSwatch__color productSwatch__color--light" : "productSwatch__color"} style={{ backgroundColor: color }} />
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
            <button className="addButton" type="button" aria-label={`Add ${product.name}`} disabled={isUnavailable} onClick={(event) => { event.stopPropagation(); handleAddToCart(); }}><span aria-hidden="true">+</span></button>
          </div>
          {helperMessage ? <p className="productCardHelper" role="status">{helperMessage}</p> : null}
        </div>
      </div>
    </article>
  );
}
