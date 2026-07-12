"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const requiresColorSelection = Boolean(sourceProduct && sourceProduct.colors.length > 1);
  const requiresSizeSelection = Boolean(sourceProduct && sourceProduct.sizes.length > 1);
  const isUnavailable = Boolean(sourceProduct && (!sourceProduct.inStock || sourceProduct.status !== "active" || (sourceProduct.stockMode === "limited" && (sourceProduct.stockQty ?? 0) <= 0)));

  useEffect(() => {
    if (!sourceProduct) return undefined;
    let cancelled = false;
    let unsubscribeAuth: (() => void) | undefined;
    Promise.all([import("@/lib/firebase/client"), import("firebase/auth"), import("firebase/firestore")]).then(([client, authModule, firestore]) => {
      unsubscribeAuth = authModule.onAuthStateChanged(client.auth, (user) => {
        if (!user) { if (!cancelled) setIsFavorite(false); return; }
        firestore.getDoc(firestore.doc(client.db, "users", user.uid, "productFavorites", sourceProduct.id)).then((snapshot) => {
          if (!cancelled) setIsFavorite(snapshot.exists());
        }).catch(() => { if (!cancelled) setIsFavorite(false); });
      });
    }).catch(() => { if (!cancelled) setIsFavorite(false); });
    return () => { cancelled = true; unsubscribeAuth?.(); };
  }, [sourceProduct]);

  function handleColorSelect(colorName: string) {
    setSelectedColor(colorName);
    setHelperMessage(null);
  }

  function handleSizeSelect(sizeLabel: string) {
    setSelectedSize(sizeLabel);
    setHelperMessage(null);
  }

  async function handleFavoriteToggle() {
    if (!sourceProduct || favoriteBusy) return;
    setFavoriteBusy(true);
    const previous = isFavorite;
    setIsFavorite(!previous);
    try {
      const [{ auth, db }, authModule, firestore] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth"), import("firebase/firestore")]);
      const user = auth.currentUser ?? await new Promise<import("firebase/auth").User | null>((resolve) => {
        const unsubscribe = authModule.onAuthStateChanged(auth, (nextUser) => { unsubscribe(); resolve(nextUser); });
      });
      if (!user) {
        setIsFavorite(previous);
        window.dispatchEvent(new CustomEvent("run213:open-auth"));
        return;
      }
      const ref = firestore.doc(db, "users", user.uid, "productFavorites", sourceProduct.id);
      if (previous) await firestore.deleteDoc(ref);
      else await firestore.setDoc(ref, { productId: sourceProduct.id, createdAt: firestore.serverTimestamp() });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("[favorites] update failed", error);
      setIsFavorite(previous);
      setHelperMessage("Could not update favorite. Please try again.");
    } finally {
      setFavoriteBusy(false);
    }
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
      <div className="productCard__media productImageWrap">
        {promo ? <span className="promoBadge">PROMO</span> : null}
        {sourceProduct ? (
          <Link className="productCard__mediaLink" href={`/product/${sourceProduct.slug}`} aria-label={`View ${product.name}`}>
            <Image src={product.image} alt={`${product.name} product image`} width={420} height={520} />
          </Link>
        ) : <Image src={product.image} alt={`${product.name} product image`} width={420} height={520} />}
        <button className="productCard__favorite favoriteButton" type="button" aria-label={`${isFavorite ? "Remove" : "Save"} ${product.name}`} aria-pressed={isFavorite} disabled={favoriteBusy} onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleFavoriteToggle(); }}>
          <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
        </button>
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
              className={color.name === selectedColor ? "productSwatch productSwatch--selected" : "productSwatch"}
              key={color.id ?? color.name}
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
