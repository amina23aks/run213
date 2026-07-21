"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { getLookPromoState } from "@/components/look/LookPriceDisplay";
import { formatDzd } from "@/constants/products";
import { useFavorites } from "@/context/favorites";
import type { Product, ProductCardView } from "@/types/product";
import type { LookImage } from "@/types/look";

type ResolvedProductFavorite = {
  id: string;
  card: ProductCardView;
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

export function getSavedItemsLabel(count: number) {
  return `${count} SAVED ITEM${count === 1 ? "" : "S"}`;
}

function getProductPromo(product: Product) {
  const compareAt = product.compareAtPriceDzd;
  const hasValidCompareAt = typeof compareAt === "number" && Number.isFinite(compareAt) && compareAt > product.priceDzd;
  const discountPercent = hasValidCompareAt ? Math.round(((compareAt - product.priceDzd) / compareAt) * 100) : 0;
  return { hasValidCompareAt, compareAt, discountPercent };
}

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
  const visibleUnavailableCount = visibleUnavailableProductIds.length + visibleUnavailableLookIds.length;
  const isEmpty = favorites.isHydrated && !favorites.totalFavoriteCount;
  const showResolvedEmpty = favorites.isHydrated && favorites.totalFavoriteCount > 0 && !isLoadingDetails && !visibleProducts.length && !visibleLooks.length && !visibleUnavailableCount && !resolutionError;

  return (
    <section className="favoritesPage" aria-labelledby="favorites-title">
      <div className="favoritesPage__header">
        <h1 id="favorites-title">FAVORITES</h1>
        <p>Products and Looks you saved.</p>
        <strong>{favorites.isHydrated ? getSavedItemsLabel(favorites.totalFavoriteCount) : "SAVED ITEMS"}</strong>
      </div>

      {favorites.error || resolutionError ? <div className="favoritesNotice" role="status"><p>{favorites.error ?? resolutionError}</p><button type="button" onClick={() => window.location.reload()}>RETRY</button></div> : null}
      {!favorites.isHydrated ? <FavoritesLoading label="Loading saved favorites." /> : null}
      {favorites.isHydrated && isLoadingDetails ? <FavoritesLoading label="Loading saved items." /> : null}
      {isEmpty ? <FavoritesEmpty /> : null}
      {showResolvedEmpty ? <UnavailableOnlyState productIds={favorites.productIds} lookIds={favorites.lookIds} /> : null}

      {visibleProducts.length ? (
        <section className="favoritesSection" aria-labelledby="favorite-products-title">
          <h2 id="favorite-products-title">PRODUCTS · {favorites.productFavoriteCount}</h2>
          <div className="favoritesCompactGrid">
            {visibleProducts.map((product) => <FavoriteProductCard product={product} key={product.id} />)}
          </div>
        </section>
      ) : null}

      {visibleLooks.length ? (
        <section className="favoritesSection" aria-labelledby="favorite-looks-title">
          <h2 id="favorite-looks-title">LOOKS · {favorites.lookFavoriteCount}</h2>
          <div className="favoritesCompactGrid">
            {visibleLooks.map((look) => <FavoriteLookCard look={look} key={look.id} />)}
          </div>
        </section>
      ) : null}

      {visibleUnavailableCount ? (
        <section className="favoritesSection" aria-labelledby="favorite-unavailable-title">
          <h2 id="favorite-unavailable-title">UNAVAILABLE · {visibleUnavailableCount}</h2>
          <div className="favoritesCompactGrid favoritesCompactGrid--unavailable">
            {visibleUnavailableProductIds.map((id) => <UnavailableFavoriteCard itemType="product" itemId={id} key={`product-${id}`} />)}
            {visibleUnavailableLookIds.map((id) => <UnavailableFavoriteCard itemType="look" itemId={id} key={`look-${id}`} />)}
          </div>
        </section>
      ) : null}

      {favorites.isHydrated && favorites.totalFavoriteCount > 0 ? <p className="favoritesGuestNote">Sign in later to keep your Favorites with your account.</p> : null}
    </section>
  );
}

function FavoritesLoading({ label }: { label: string }) {
  return <div className="favoritesLoading" role="status" aria-live="polite"><span>{label}</span>{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>;
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

function UnavailableOnlyState({ productIds, lookIds }: { productIds: string[]; lookIds: string[] }) {
  return (
    <div className="favoritesCompactGrid favoritesUnavailableOnly">
      {[...productIds.map((id) => ({ itemType: "product" as const, itemId: id })), ...lookIds.map((id) => ({ itemType: "look" as const, itemId: id }))].map((item) => <UnavailableFavoriteCard {...item} key={`${item.itemType}-${item.itemId}`} />)}
    </div>
  );
}

function FavoriteProductCard({ product }: { product: ResolvedProductFavorite }) {
  const href = `/product/${product.sourceProduct.slug}`;
  const promo = getProductPromo(product.sourceProduct);
  return (
    <article className="favoriteCompactCard favoriteCompactCard--product">
      <div className="favoriteCompactCard__media">
        <Link href={href} aria-label={`View product ${product.card.name}`}>
          <Image src={product.card.image} alt={product.sourceProduct.images[0]?.alt || `${product.card.name} product image`} fill sizes="(max-width: 339px) 100vw, (max-width: 900px) 50vw, (max-width: 1279px) 33vw, 25vw" unoptimized />
        </Link>
        <FavoriteButton itemType="product" itemId={product.id} itemName={product.card.name} variant="card" className="favoriteCompactCard__favorite" />
      </div>
      <div className="favoriteCompactCard__body">
        <h3><Link href={href}>{product.card.name}</Link></h3>
        <div className="favoriteCompactCard__price">
          <strong>{formatDzd(product.sourceProduct.priceDzd)}</strong>
          {promo.hasValidCompareAt ? <del>{formatDzd(promo.compareAt ?? 0)}</del> : null}
          {promo.hasValidCompareAt ? <em aria-label={`${promo.discountPercent}% discount`}>-{promo.discountPercent}%</em> : null}
        </div>
        <Link className="favoriteCompactCard__action" href={href} aria-label={`View product ${product.card.name}`}>VIEW PRODUCT <span>→</span></Link>
      </div>
    </article>
  );
}

function UnavailableFavoriteCard({ itemType, itemId }: { itemType: "product" | "look"; itemId: string }) {
  return (
    <article className="favoriteCompactCard favoriteUnavailableCard">
      <FavoriteButton itemType={itemType} itemId={itemId} itemName="saved item" variant="card" className="favoriteCompactCard__favorite" />
      <div className="favoriteUnavailableCard__placeholder" aria-hidden="true">♡</div>
      <div className="favoriteCompactCard__body">
        <h3>This saved item is no longer available.</h3>
        <p>Remove it from your Favorites or keep it saved in case it returns.</p>
      </div>
    </article>
  );
}

function FavoriteLookCard({ look }: { look: ResolvedLookFavorite }) {
  const promo = getLookPromoState({ priceDzd: look.priceDzd, compareAtPriceDzd: look.compareAtPriceDzd, discountPercent: look.discountPercent, isPromo: look.isPromo });
  return (
    <article className="favoriteCompactCard favoriteCompactCard--look">
      <div className="favoriteCompactCard__media">
        <Link href={look.href} aria-label={`View look ${look.name}`}>
          <Image src={look.image.url} alt={look.image.alt || look.name} fill sizes="(max-width: 339px) 100vw, (max-width: 900px) 50vw, (max-width: 1279px) 33vw, 25vw" unoptimized />
        </Link>
        <FavoriteButton itemType="look" itemId={look.id} itemName={look.name} variant="card" className="favoriteCompactCard__favorite" />
      </div>
      <div className="favoriteCompactCard__body">
        {look.productCount ? <span>{look.productCount} PRODUCT{look.productCount === 1 ? "" : "S"}</span> : null}
        <h3><Link href={look.href}>{look.name}</Link></h3>
        {look.description ? <p>{look.description}</p> : null}
        <div className="favoriteCompactCard__price">
          <strong>{formatDzd(look.priceDzd)}</strong>
          {promo.isValidPromo ? <del>{formatDzd(look.compareAtPriceDzd ?? 0)}</del> : null}
          {promo.isValidPromo ? <em aria-label={`${promo.discountPercent}% discount`}>-{promo.discountPercent}%</em> : null}
        </div>
        {promo.savingsDzd > 0 ? <small>You save {formatDzd(promo.savingsDzd)}</small> : null}
        <Link className="favoriteCompactCard__action" href={look.href} aria-label={`View look ${look.name}`}>VIEW LOOK <span>→</span></Link>
      </div>
    </article>
  );
}
