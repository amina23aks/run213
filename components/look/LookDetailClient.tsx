"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDzd } from "@/constants/products";
import { calculateLookGroupPrice, isValidLookPrice } from "@/lib/lookPricing";
import { useCart } from "@/context/cart";
import type { LookWithProducts } from "@/types/look";
import type { Product } from "@/types/product";

type SelectedItem = {
  enabled: boolean;
  color: string | null;
  size: string | null;
};

const LOOK_VALIDATION_MESSAGE = "Select a size and color for every item before adding this Look to your cart.";

function isUnavailable(product: Product | null) {
  if (!product) return true;
  if (product.status !== "active" || !product.inStock) return true;
  if (product.stockMode === "limited" && (product.stockQty ?? 0) <= 0) return true;
  return false;
}

function needsColor(product: Product) { return product.colors.length > 0; }
function needsSize(product: Product) { return product.sizes.length > 0; }

export function LookDetailClient({ look }: { look: LookWithProducts }) {
  const { addLookGroup } = useCart();
  const [message, setMessage] = useState<string | null>(null);
  const [invalidIds, setInvalidIds] = useState<Set<string>>(() => new Set());
  const [isLookFavorite, setIsLookFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [selected, setSelected] = useState<Record<string, SelectedItem>>(() => Object.fromEntries(look.products.map(({ productId, product }) => [productId, {
    enabled: !isUnavailable(product),
    color: product?.colors.length === 1 ? product.colors[0]?.name ?? null : null,
    size: product?.sizes.length === 1 ? product.sizes[0]?.label ?? null : null,
  }])));

  const selectedProductLines = look.products.flatMap(({ productId, product }) => {
    const state = selected[productId];
    return state?.enabled && product ? [{ productId, priceDzd: product.priceDzd, quantity: 1 }] : [];
  });
  const priceResult = calculateLookGroupPrice({ canonicalLookPriceDzd: look.priceDzd, originalProductIds: look.productIds, selectedProductLines });
  const total = priceResult.subtotalDzd;
  const hasValidLookPrice = isValidLookPrice(look.priceDzd);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeAuth: (() => void) | undefined;
    Promise.all([import("@/lib/firebase/client"), import("firebase/auth"), import("firebase/firestore")]).then(([client, authModule, firestore]) => {
      unsubscribeAuth = authModule.onAuthStateChanged(client.auth, (user) => {
        if (!user) { if (!cancelled) setIsLookFavorite(false); return; }
        firestore.getDoc(firestore.doc(client.db, "users", user.uid, "lookFavorites", look.id)).then((snapshot) => {
          if (!cancelled) setIsLookFavorite(snapshot.exists());
        }).catch(() => { if (!cancelled) setIsLookFavorite(false); });
      });
    }).catch(() => { if (!cancelled) setIsLookFavorite(false); });
    return () => { cancelled = true; unsubscribeAuth?.(); };
  }, [look.id]);

  async function handleLookFavoriteToggle() {
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    const previous = isLookFavorite;
    setIsLookFavorite(!previous);
    try {
      const [{ auth, db }, authModule, firestore] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth"), import("firebase/firestore")]);
      const user = auth.currentUser ?? await new Promise<import("firebase/auth").User | null>((resolve) => {
        const unsubscribe = authModule.onAuthStateChanged(auth, (nextUser) => { unsubscribe(); resolve(nextUser); });
      });
      if (!user) { setIsLookFavorite(previous); window.dispatchEvent(new CustomEvent("run213:open-auth")); return; }
      const ref = firestore.doc(db, "users", user.uid, "lookFavorites", look.id);
      if (previous) await firestore.deleteDoc(ref);
      else await firestore.setDoc(ref, { lookId: look.id, lookSlug: look.slug, createdAt: firestore.serverTimestamp() });
    } catch {
      setIsLookFavorite(previous);
      setMessage("Could not update favorite. Please try again.");
    } finally {
      setFavoriteBusy(false);
    }
  }

  function patchItem(productId: string, patch: Partial<SelectedItem>) {
    setSelected((current) => ({ ...current, [productId]: { ...current[productId], ...patch } }));
    setMessage(null);
    setInvalidIds((current) => {
      if (!current.has(productId)) return current;
      const next = new Set(current);
      next.delete(productId);
      return next;
    });
  }

  function addSelectedLook() {
    const invalid = new Set<string>();
    const preparedItems: Array<{ product: Product; selectedColor: string | null; selectedSize: string | null; quantity: number }> = [];

    for (const { productId, product } of look.products) {
      const state = selected[productId];
      if (!state?.enabled) continue;
      if (!product || isUnavailable(product)) {
        invalid.add(productId);
        continue;
      }
      if ((needsColor(product) && !state.color) || (needsSize(product) && !state.size)) {
        invalid.add(productId);
        continue;
      }
      preparedItems.push({ product, selectedColor: state.color, selectedSize: state.size, quantity: 1 });
    }

    if (!hasValidLookPrice) {
      setInvalidIds(new Set());
      setMessage("This Look is unavailable until a valid selling price is added.");
      return;
    }

    if (!preparedItems.length || invalid.size > 0) {
      setInvalidIds(invalid);
      setMessage(LOOK_VALIDATION_MESSAGE);
      const firstInvalidId = [...invalid][0];
      if (firstInvalidId) itemRefs.current[firstInvalidId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const lookGroupId = `look-${look.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const wasAdded = addLookGroup({
      group: {
        id: lookGroupId,
        lookId: look.id,
        slug: look.slug,
        name: look.name,
        image: look.heroImage.url,
        description: look.description,
        priceDzd: look.priceDzd,
        originalProductIds: look.productIds,
      },
      items: preparedItems,
    });

    setInvalidIds(new Set());
    setMessage(wasAdded ? `Added ${preparedItems.length} look item${preparedItems.length === 1 ? "" : "s"} to cart as one Look.` : LOOK_VALIDATION_MESSAGE);
  }

  return (
    <section className="lookDetailSection">
      <div className="lookDetailHero">
        <Image src={look.heroImage.url} alt={look.heroImage.alt} width={860} height={980} priority unoptimized />
      </div>
      <div className="lookDetailPanel">
        <span>{look.numberLabel ?? "LOOK"}</span>
        <h1>{look.name}</h1>
        <p>{look.description}</p>
        <div className="lookTotalBar"><span>{priceResult.pricingMode === "look-price" ? "Look total" : "Selected items total"}</span><strong>{hasValidLookPrice || total > 0 ? formatDzd(total) : "Unavailable"}</strong>{look.isPromo && look.compareAtPriceDzd && look.compareAtPriceDzd > look.priceDzd ? <small><b className="discountBadge">PROMO</b> <del>{formatDzd(look.compareAtPriceDzd)}</del> <em>-{look.discountPercent ?? Math.round(((look.compareAtPriceDzd - look.priceDzd) / look.compareAtPriceDzd) * 100)}%</em></small> : null}</div>
        <div className="lookItemsList">
          {look.products.map(({ productId, product }) => {
            const state = selected[productId] ?? { enabled: false, color: null, size: null };
            const unavailable = isUnavailable(product);
            const isInvalid = invalidIds.has(productId);
            return (
              <article ref={(node) => { itemRefs.current[productId] = node; }} className={unavailable || !state.enabled ? "lookItem is-muted" : isInvalid ? "lookItem is-invalid" : "lookItem"} key={productId}>
                {product ? <Image src={product.images[0]?.url ?? "/placeholders/product-placeholder.webp"} alt={product.images[0]?.alt || product.name} width={100} height={100} unoptimized /> : <div className="lookMissingProduct">Unavailable</div>}
                <div>
                  <div className="lookItemHeader">
                    <div>{product ? <Link href={`/product/${product.slug}`}>{product.name}</Link> : <strong>Unavailable product</strong>}{product ? <span>Included in Look</span> : null}</div>
                    <button type="button" disabled={unavailable} onClick={() => patchItem(productId, { enabled: !state.enabled })}>{state.enabled ? "Remove" : "Restore"}</button>
                  </div>
                  {unavailable ? <p className="lookUnavailable">Unavailable or out of stock.</p> : null}
                  {isInvalid ? <p className="lookItemError">Choose required size and color.</p> : null}
                  {product && !unavailable && state.enabled ? <div className="lookItemOptions">
                    {product.colors.length ? <div>{product.colors.map((color) => <button className={state.color === color.name ? "productSwatch productSwatch--selected" : "productSwatch"} type="button" key={color.id ?? color.name} aria-label={`Select ${color.name}`} aria-pressed={state.color === color.name} onClick={() => patchItem(productId, { color: color.name })}><span className="productSwatch__color" style={{ backgroundColor: color.hex }} /></button>)}</div> : null}
                    {product.sizes.length ? <div>{product.sizes.map((size) => <button className={state.size === size.label ? "isSelected" : undefined} type="button" key={size.label} onClick={() => patchItem(productId, { size: size.label })}>{size.label}</button>)}</div> : null}
                  </div> : null}
                </div>
              </article>
            );
          })}
        </div>
        {message ? <p className={message === LOOK_VALIDATION_MESSAGE ? "lookCartMessage lookCartMessage--error" : "lookCartMessage"} role="status">{message}</p> : null}
        <div className="lookActions">
          <button className="lookActions__cart" type="button" disabled={!hasValidLookPrice || priceResult.selectedItemCount === 0} onClick={addSelectedLook}>ADD LOOK TO CART</button>
          <button className="lookActions__favorite" type="button" aria-label={`${isLookFavorite ? "Remove" : "Add"} Look favorite`} aria-pressed={isLookFavorite} disabled={favoriteBusy} onClick={handleLookFavoriteToggle}>{isLookFavorite ? "♥" : "♡"}</button>
        </div>
      </div>
    </section>
  );
}
