"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDzd } from "@/constants/products";
import { useCart } from "@/context/cart";
import type { LookWithProducts } from "@/types/look";
import type { Product } from "@/types/product";

type SelectedItem = {
  enabled: boolean;
  color: string | null;
  size: string | null;
};

function isUnavailable(product: Product | null) {
  if (!product) return true;
  if (product.status !== "active" || !product.inStock) return true;
  if (product.stockMode === "limited" && (product.stockQty ?? 0) <= 0) return true;
  return false;
}

export function LookDetailClient({ look }: { look: LookWithProducts }) {
  const { addItem } = useCart();
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, SelectedItem>>(() => Object.fromEntries(look.products.map(({ productId, product }) => [productId, {
    enabled: !isUnavailable(product),
    color: product?.colors.length === 1 ? product.colors[0]?.name ?? null : null,
    size: product?.sizes.length === 1 ? product.sizes[0]?.label ?? null : null,
  }])));

  const total = useMemo(() => look.products.reduce((sum, entry) => {
    const state = selected[entry.productId];
    return state?.enabled && entry.product && !isUnavailable(entry.product) ? sum + entry.product.priceDzd : sum;
  }, 0), [look.products, selected]);

  function patchItem(productId: string, patch: Partial<SelectedItem>) {
    setSelected((current) => ({ ...current, [productId]: { ...current[productId], ...patch } }));
    setMessage(null);
  }

  function addSelectedLook() {
    let added = 0;
    let blocked = 0;
    look.products.forEach(({ productId, product }) => {
      const state = selected[productId];
      if (!state?.enabled || !product || isUnavailable(product)) return;
      const ok = addItem({ product, selectedColor: state.color, selectedSize: state.size, quantity: 1 });
      if (ok) added += 1;
      else blocked += 1;
    });
    setMessage(added ? `Added ${added} look item${added === 1 ? "" : "s"} to cart.${blocked ? " Choose missing sizes/colors for remaining items." : ""}` : "Choose size/color for at least one available item.");
  }

  return (
    <section className="lookDetailSection">
      <div className="lookDetailHero">
        <Image src={look.heroImage.url} alt={look.heroImage.alt} width={920} height={1040} priority unoptimized />
      </div>
      <div className="lookDetailPanel">
        <span>{look.numberLabel ?? "LOOK"}</span>
        <h1>{look.name}</h1>
        <p>{look.description}</p>
        <div className="lookBundleBar"><strong>{formatDzd(total)}</strong><button type="button" onClick={addSelectedLook}>ADD SELECTED LOOK TO CART →</button></div>
        {message ? <p className="lookCartMessage" role="status">{message}</p> : null}
        <div className="lookItemsList">
          {look.products.map(({ productId, product }) => {
            const state = selected[productId] ?? { enabled: false, color: null, size: null };
            const unavailable = isUnavailable(product);
            return (
              <article className={unavailable || !state.enabled ? "lookItem is-muted" : "lookItem"} key={productId}>
                {product ? <Image src={product.images[0]?.url ?? "/placeholders/product-placeholder.webp"} alt={product.images[0]?.alt || product.name} width={110} height={110} unoptimized /> : <div className="lookMissingProduct">Unavailable</div>}
                <div>
                  <div className="lookItemHeader">
                    <div>{product ? <Link href={`/product/${product.slug}`}>{product.name}</Link> : <strong>Unavailable product</strong>}{product ? <span>{formatDzd(product.priceDzd)}</span> : null}</div>
                    <button type="button" disabled={unavailable} onClick={() => patchItem(productId, { enabled: !state.enabled })}>{state.enabled ? "Remove" : "Restore"}</button>
                  </div>
                  {unavailable ? <p className="lookUnavailable">Unavailable or out of stock.</p> : null}
                  {product && !unavailable && state.enabled ? <div className="lookItemOptions">
                    {product.colors.length ? <div>{product.colors.map((color) => <button className={state.color === color.name ? "productSwatch productSwatch--selected" : "productSwatch"} type="button" key={color.name} aria-label={`Select ${color.name}`} aria-pressed={state.color === color.name} onClick={() => patchItem(productId, { color: color.name })}><span className="productSwatch__color" style={{ backgroundColor: color.hex }} /></button>)}</div> : null}
                    {product.sizes.length ? <div>{product.sizes.map((size) => <button className={state.size === size.label ? "isSelected" : undefined} type="button" key={size.label} onClick={() => patchItem(productId, { size: size.label })}>{size.label}</button>)}</div> : null}
                  </div> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
