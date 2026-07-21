"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { LookPriceDisplay, getLookPromoState } from "@/components/look/LookPriceDisplay";
import { formatDzd } from "@/constants/products";
import { useFavorites } from "@/context/favorites";
import type { Product } from "@/types/product";
import type { LookImage } from "@/types/look";

type ResolvedProductFavorite = {
  id: string;
  sourceProduct: Product;
};

type ResolvedLookFavorite = {
  id: string;
  href: string;
  name: string;
  description: string;
  image: LookImage;
  priceDzd: number;
  compareAtPriceDzd: number | null;
  discountPercent: number;
  isPromo: boolean;
  productCount: number;
};

type ResolveResponse = {
  products: ResolvedProductFavorite[];
  looks: ResolvedLookFavorite[];
  unavailableProductIds: string[];
  unavailableLookIds: string[];
  error?: string;
};

export function FavoritesPageClient() {
  const favorites = useFavorites();
  const [products, setProducts] = useState<ResolvedProductFavorite[]>([]);
  const [looks, setLooks] = useState<ResolvedLookFavorite[]>([]);
  const [unavailableProductIds, setUnavailableProductIds] = useState<string[]>([]);
  const [unavailableLookIds, setUnavailableLookIds] = useState<string[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  const productIdKey = favorites.productIds.join("|");
  const lookIdKey = favorites.lookIds.join("|");

  useEffect(() => {
    if (!favorites.isHydrated) return undefined;
    const productIds = productIdKey ? productIdKey.split("|") : [];
    const lookIds = lookIdKey ? lookIdKey.split("|") : [];
    if (!productIds.length && !lookIds.length) {
      queueMicrotask(() => {
        setProducts([]);
        setLooks([]);
        setUnavailableProductIds([]);
        setUnavailableLookIds([]);
        setResolutionError(null);
        setIsLoadingDetails(false);
      });
      return undefined;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setIsLoadingDetails(true);
      setResolutionError(null);

      fetch("/api/favorites/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds, lookIds }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json() as ResolveResponse;
          if (!response.ok) throw new Error(payload.error ?? "Favorites could not be loaded right now.");
          return payload;
        })
        .then((payload) => {
          setProducts(payload.products);
          setLooks(payload.looks);
          setUnavailableProductIds(payload.unavailableProductIds);
          setUnavailableLookIds(payload.unavailableLookIds);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if (process.env.NODE_ENV !== "production") console.error("[favorites] detail resolution failed", error);
          setResolutionError("Favorites could not be loaded right now. Please try again.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoadingDetails(false);
        });
    });

    return () => controller.abort();
  }, [favorites.isHydrated, productIdKey, lookIdKey]);

  const visibleProducts = useMemo(() => products.filter((product) => favorites.productIds.includes(product.id)), [favorites.productIds, products]);
  const visibleLooks = useMemo(() => looks.filter((look) => favorites.lookIds.includes(look.id)), [favorites.lookIds, looks]);
  const visibleUnavailableProductIds = useMemo(() => unavailableProductIds.filter((id) => favorites.productIds.includes(id)), [favorites.productIds, unavailableProductIds]);
  const visibleUnavailableLookIds = useMemo(() => unavailableLookIds.filter((id) => favorites.lookIds.includes(id)), [favorites.lookIds, unavailableLookIds]);
  const unavailableCount = visibleUnavailableProductIds.length + visibleUnavailableLookIds.length;
  const hasAvailableProducts = visibleProducts.length > 0;
  const hasAvailableLooks = visibleLooks.length > 0;
  const hasUnavailable = unavailableCount > 0;
  const isEmpty = favorites.isHydrated && !favorites.totalFavoriteCount;
  const showUnavailableOnly = favorites.isHydrated && favorites.totalFavoriteCount > 0 && !isLoadingDetails && !hasAvailableProducts && !hasAvailableLooks && hasUnavailable;

  return (
    <section className="favoritesPage" aria-labelledby="favorites-title">
      <div className="favoritesPage__header">
        <h1 id="favorites-title">FAVORITES</h1>
        <p>Products and Looks you saved.</p>
        <strong>{favorites.isHydrated ? formatSavedItemsLabel(favorites.totalFavoriteCount) : "Loading saved items"}</strong>
      </div>

      {favorites.error || resolutionError ? (
        <div className="favoritesNotice" role="status">
          <span>{favorites.error ?? resolutionError}</span>
          <button type="button" onClick={() => { void favorites.retry(); }}>Retry</button>
        </div>
      ) : null}
      {!favorites.isHydrated ? <FavoritesLoading label="Loading saved favorites." /> : null}
      {favorites.isHydrated && isLoadingDetails ? <FavoritesLoading label="Loading saved items." /> : null}
      {isEmpty ? <FavoritesEmpty /> : null}

      {hasAvailableProducts ? (
        <section className="favoritesSection" aria-labelledby="favorite-products-title">
          <div className="favoritesSection__heading">
            <h2 id="favorite-products-title">PRODUCTS · {favorites.productFavoriteCount}</h2>
          </div>
          <div className="favoritesCompactGrid">
            {visibleProducts.map((product) => <FavoriteProductCard product={product.sourceProduct} key={product.id} />)}
          </div>
        </section>
      ) : null}

      {hasAvailableLooks ? (
        <section className="favoritesSection" aria-labelledby="favorite-looks-title">
          <div className="favoritesSection__heading">
            <h2 id="favorite-looks-title">LOOKS · {favorites.lookFavoriteCount}</h2>
          </div>
          <div className="favoritesCompactGrid">
            {visibleLooks.map((look) => <FavoriteLookCard look={look} key={look.id} />)}
          </div>
        </section>
      ) : null}

      {hasUnavailable || showUnavailableOnly ? (
        <section className="favoritesSection" aria-labelledby="favorite-unavailable-title">
          <div className="favoritesSection__heading">
            <h2 id="favorite-unavailable-title">UNAVAILABLE · {unavailableCount || favorites.totalFavoriteCount}</h2>
          </div>
          <div className="favoritesCompactGrid favoritesCompactGrid--unavailable">
            {[...visibleUnavailableProductIds.map((id) => ({ itemType: "product" as const, itemId: id })), ...visibleUnavailableLookIds.map((id) => ({ itemType: "look" as const, itemId: id }))].map((item) => <UnavailableFavoriteCard {...item} key={`${item.itemType}-${item.itemId}`} />)}
          </div>
        </section>
      ) : null}

      {favorites.isHydrated && favorites.totalFavoriteCount > 0 ? <p className="favoritesGuestNote">Sign in later to keep your Favorites with your account.</p> : null}
    </section>
  );
}

function formatSavedItemsLabel(count: number) {
  return `${count} SAVED ${count === 1 ? "ITEM" : "ITEMS"}`;
}

function FavoritesLoading({ label }: { label: string }) {
  return <div className="favoritesLoading" role="status" aria-live="polite"><span>{label}</span><i /><i /><i /><i /></div>;
}

function FavoritesEmpty() {
  return (
    <div className="favoritesEmpty">
      <h2>NO FAVORITES YET.</h2>
      <p>Save Products or Looks and they will appear here.</p>
      <Link href="/shop">EXPLORE SHOP <span>→</span></Link>
    </div>
  );
}

function FavoriteProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const hasPromo = typeof product.compareAtPriceDzd === "number" && product.compareAtPriceDzd > product.priceDzd;
  const discount = hasPromo ? Math.round(((product.compareAtPriceDzd ?? 0) - product.priceDzd) / (product.compareAtPriceDzd ?? 1) * 100) : 0;

  return (
    <article className="favoriteSavedCard">
      <Link className="favoriteSavedCard__media favoriteSavedCard__media--product" href={`/product/${product.slug}`} aria-label={`View ${product.name}`}>
        <Image src={image?.url ?? "/placeholders/product-placeholder.webp"} alt={image?.alt || `${product.name} product image`} fill sizes="(max-width: 700px) 50vw, 260px" unoptimized />
      </Link>
      <FavoriteButton itemType="product" itemId={product.id} itemName={product.name} variant="card" className="favoriteSavedCard__favorite" />
      <div className="favoriteSavedCard__body">
        <h3><Link href={`/product/${product.slug}`}>{product.name}</Link></h3>
        <div className="favoriteSavedCard__price">
          <strong>{formatDzd(product.priceDzd)}</strong>
          {hasPromo ? <><del>{formatDzd(product.compareAtPriceDzd ?? 0)}</del><em aria-label={`${discount}% discount`}>-{discount}%</em></> : null}
        </div>
        <Link className="favoriteSavedCard__action" href={`/product/${product.slug}`}>VIEW PRODUCT <span>→</span></Link>
      </div>
    </article>
  );
}

function UnavailableFavoriteCard({ itemType, itemId }: { itemType: "product" | "look"; itemId: string }) {
  return (
    <article className="favoriteSavedCard favoriteSavedCard--unavailable">
      <div className="favoriteSavedCard__placeholder" aria-hidden="true">♡</div>
      <FavoriteButton itemType={itemType} itemId={itemId} itemName="saved item" variant="card" className="favoriteSavedCard__favorite" />
      <div className="favoriteSavedCard__body">
        <h3>This saved item is no longer available.</h3>
        <p>Remove it from your Favorites or keep it saved in case it returns.</p>
      </div>
    </article>
  );
}

function FavoriteLookCard({ look }: { look: ResolvedLookFavorite }) {
  const promo = getLookPromoState(look);
  const savingsLabel = promo.savingsDzd > 0 ? `Save ${formatDzd(promo.savingsDzd)}` : "";

  return (
    <article className="favoriteSavedCard favoriteSavedCard--look">
      <Link className="favoriteSavedCard__media favoriteSavedCard__media--look" href={look.href} aria-label={`View ${look.name}`}>
        <Image src={look.image.url} alt={look.image.alt || look.name} fill sizes="(max-width: 700px) 50vw, 260px" unoptimized />
      </Link>
      <FavoriteButton itemType="look" itemId={look.id} itemName={look.name} variant="card" className="favoriteSavedCard__favorite" />
      <div className="favoriteSavedCard__body">
        <span>{look.productCount} PRODUCT{look.productCount === 1 ? "" : "S"}</span>
        <h3><Link href={look.href}>{look.name}</Link></h3>
        {look.description ? <p>{look.description}</p> : null}
        <LookPriceDisplay priceDzd={look.priceDzd} compareAtPriceDzd={look.compareAtPriceDzd} discountPercent={look.discountPercent} isPromo={look.isPromo} savingsLabel={savingsLabel} />
        <Link className="favoriteSavedCard__action" href={look.href}>VIEW LOOK <span>→</span></Link>
      </div>
    </article>
  );
}
