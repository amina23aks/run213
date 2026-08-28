"use client";

import Image from "next/image";
import { CLOUDINARY_IMAGE_WIDTHS, cloudinaryImageUrl } from "@/lib/cloudinary-delivery";
import Link from "next/link";
import { useRef, useState } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { LookPriceDisplay } from "@/components/look/LookPriceDisplay";
import { calculateLookGroupPrice, isValidLookPrice } from "@/lib/lookPricing";
import { useCart } from "@/context/cart";
import type { LookWithProducts } from "@/types/look";
import type { Product } from "@/types/product";
import { isProductInStock } from "@/lib/products/availability";
import { FallbackImage } from "@/components/ui/FallbackImage";

type SelectedItem = {
  enabled: boolean;
  colorId: string | null;
  size: string | null;
};

const LOOK_VALIDATION_MESSAGE = "Select a size and color for every item before adding this Look to your cart.";

function isUnavailable(product: Product | null) {
  return !product || !isProductInStock(product);
}

function needsColor(product: Product) { return product.colors.length > 0; }
function needsSize(product: Product) { return product.sizes.length > 0; }

export function getLookItemImage(product: Product, selectedColorId: string | null) {
  return (selectedColorId ? product.images.find((image) => image.colorId === selectedColorId) : null) ?? product.images[0] ?? null;
}

export function LookDetailClient({ look }: { look: LookWithProducts }) {
  const { addLookGroup } = useCart();
  const [message, setMessage] = useState<string | null>(null);
  const [invalidIds, setInvalidIds] = useState<Set<string>>(() => new Set());
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [selected, setSelected] = useState<Record<string, SelectedItem>>(() => Object.fromEntries(look.products.map(({ productId, product }) => [productId, {
    enabled: !isUnavailable(product),
    colorId: product?.colors.length === 1 ? product.colors[0]?.id ?? null : null,
    size: product?.sizes.length === 1 ? product.sizes[0]?.label ?? null : null,
  }])));

  const selectedProductLines = look.products.flatMap(({ productId, product }) => {
    const state = selected[productId];
    return state?.enabled && product ? [{ productId, priceDzd: product.priceDzd, quantity: 1 }] : [];
  });
  const priceResult = calculateLookGroupPrice({ canonicalLookPriceDzd: look.priceDzd, originalProductIds: look.productIds, selectedProductLines });
  const hasValidLookPrice = isValidLookPrice(look.priceDzd);

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
    const preparedItems: Array<{ product: Product; selectedColorId: string | null; selectedSize: string | null; quantity: number }> = [];

    for (const { productId, product } of look.products) {
      const state = selected[productId];
      if (!state?.enabled) continue;
      if (!product || isUnavailable(product)) {
        invalid.add(productId);
        continue;
      }
      if ((needsColor(product) && !state.colorId) || (needsSize(product) && !state.size)) {
        invalid.add(productId);
        continue;
      }
      preparedItems.push({ product, selectedColorId: state.colorId, selectedSize: state.size, quantity: 1 });
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
        <FallbackImage fallbackSrc="/placeholders/product-placeholder.webp" src={cloudinaryImageUrl(look.heroImage.url, { width: CLOUDINARY_IMAGE_WIDTHS.lookDetail })} alt={look.heroImage.alt || look.name} width={860} height={980} sizes="(max-width: 899px) 100vw, 860px" priority unoptimized />
      </div>
      <div className="lookDetailPanel">
        <h1>{look.name}</h1>
        <p>{look.description}</p>
        {hasValidLookPrice ? <LookPriceDisplay priceDzd={look.priceDzd} compareAtPriceDzd={look.compareAtPriceDzd} discountPercent={look.discountPercent} isPromo={look.isPromo} savingsLabel="Save {amount} when you buy the complete Look." /> : <div className="lookTotalBar"><span>Look total</span><strong>Unavailable</strong></div>}
        <div className="lookItemsList">
          {look.products.map(({ productId, product }) => {
            const state = selected[productId] ?? { enabled: false, colorId: null, size: null };
            const unavailable = isUnavailable(product);
            const isInvalid = invalidIds.has(productId);
            const itemImage = product ? getLookItemImage(product, state.colorId) : null;
            return (
              <article ref={(node) => { itemRefs.current[productId] = node; }} className={unavailable || !state.enabled ? "lookItem is-muted" : isInvalid ? "lookItem is-invalid" : "lookItem"} key={productId}>
                {product ? <Image src={cloudinaryImageUrl(itemImage?.url ?? "/placeholders/product-placeholder.webp", { width: CLOUDINARY_IMAGE_WIDTHS.productThumbnail })} alt={itemImage?.alt || product.name} width={100} height={100} sizes="100px" unoptimized /> : <div className="lookMissingProduct">Unavailable</div>}
                <div>
                  <div className="lookItemHeader">
                    <div>{product ? <Link href={`/product/${product.slug}`}>{product.name}</Link> : <strong>Unavailable product</strong>}{product ? <span>Included in Look</span> : null}</div>
                    <button type="button" disabled={unavailable} onClick={() => patchItem(productId, { enabled: !state.enabled })}>{state.enabled ? "Remove" : "Restore"}</button>
                  </div>
                  {unavailable ? <p className="lookUnavailable">Unavailable or out of stock.</p> : null}
                  {isInvalid ? <p className="lookItemError">Choose required size and color.</p> : null}
                  {product && !unavailable && state.enabled ? <div className="lookItemOptions">
                    {product.colors.length ? <div>{product.colors.map((color) => <button className={state.colorId === color.id ? "productSwatch productSwatch--selected" : "productSwatch"} type="button" key={color.id} aria-label={`Select ${color.name}`} aria-pressed={state.colorId === color.id} onClick={() => patchItem(productId, { colorId: color.id })}><span className="productSwatch__color" style={{ backgroundColor: color.hex }} /></button>)}</div> : null}
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
          <FavoriteButton itemType="look" itemId={look.id} itemName={look.name} variant="detail" stopPropagation={false} />
        </div>
      </div>
    </section>
  );
}
