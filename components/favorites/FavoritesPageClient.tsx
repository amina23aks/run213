"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { ProductCard } from "@/components/home/ProductCard";
import { LookPriceDisplay } from "@/components/look/LookPriceDisplay";
import { useFavorites } from "@/context/favorites";
import type { Product, ProductCardView } from "@/types/product";
import type { LookImage } from "@/types/look";

type FavoritesFilter = "all" | "products" | "looks";

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

const filters: Array<{ id: FavoritesFilter; label: string }> = [
  { id: "all", label: "ALL" },
  { id: "products", label: "PRODUCTS" },
  { id: "looks", label: "LOOKS" },
];

export function FavoritesPageClient() {
  const favorites = useFavorites();
  const [activeFilter, setActiveFilter] = useState<FavoritesFilter>("all");
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
  const hasProducts = visibleProducts.length > 0 || visibleUnavailableProductIds.length > 0;
  const hasLooks = visibleLooks.length > 0 || visibleUnavailableLookIds.length > 0;
  const showProducts = (activeFilter === "all" || activeFilter === "products") && hasProducts;
  const showLooks = (activeFilter === "all" || activeFilter === "looks") && hasLooks;
  const isEmpty = favorites.isHydrated && !favorites.totalFavoriteCount;
  const showResolvedEmpty = favorites.isHydrated && favorites.totalFavoriteCount > 0 && !isLoadingDetails && !hasProducts && !hasLooks && !resolutionError;

  return (
    <section className="favoritesPage" aria-labelledby="favorites-title">
      <div className="favoritesPage__header">
        <span>ACCOUNT</span>
        <h1 id="favorites-title">FAVORITES</h1>
        <p>Products and Looks you saved.</p>
      </div>

      <div className="favoritesSummary" role="tablist" aria-label="Favorites filters">
        {filters.map((filter) => {
          const count = filter.id === "products" ? favorites.productFavoriteCount : filter.id === "looks" ? favorites.lookFavoriteCount : favorites.totalFavoriteCount;
          return (
            <button
              className={activeFilter === filter.id ? "favoritesSummary__tab is-active" : "favoritesSummary__tab"}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.id}
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label} <strong>{favorites.isHydrated ? count : "—"}</strong>
            </button>
          );
        })}
      </div>

      {favorites.error || resolutionError ? <p className="favoritesNotice" role="status">{favorites.error ?? resolutionError}</p> : null}
      {!favorites.isHydrated ? <FavoritesLoading label="Loading saved favorites." /> : null}
      {favorites.isHydrated && isLoadingDetails ? <FavoritesLoading label="Loading saved items." /> : null}
      {isEmpty ? <FavoritesEmpty /> : null}
      {showResolvedEmpty ? <UnavailableOnlyState productIds={favorites.productIds} lookIds={favorites.lookIds} /> : null}

      {showProducts ? (
        <section className="favoritesSection" aria-labelledby="favorite-products-title">
          <div className="favoritesSection__heading">
            <span>PRODUCTS</span>
            <h2 id="favorite-products-title">Saved Products</h2>
          </div>
          <div className="favoritesProductGrid">
            {visibleProducts.map((product) => <ProductCard product={product.card} sourceProduct={product.sourceProduct} promo={product.sourceProduct.isPromo} key={product.id} />)}
            {visibleUnavailableProductIds.map((id) => <UnavailableFavoriteCard itemType="product" itemId={id} key={id} />)}
          </div>
        </section>
      ) : null}

      {showLooks ? (
        <section className="favoritesSection" aria-labelledby="favorite-looks-title">
          <div className="favoritesSection__heading">
            <span>LOOKS</span>
            <h2 id="favorite-looks-title">Saved Looks</h2>
          </div>
          <div className="favoritesLookGrid">
            {visibleLooks.map((look) => <LookFavoriteCard look={look} key={look.id} />)}
            {visibleUnavailableLookIds.map((id) => <UnavailableFavoriteCard itemType="look" itemId={id} key={id} />)}
          </div>
        </section>
      ) : null}

      {favorites.isHydrated && favorites.totalFavoriteCount > 0 ? <p className="favoritesGuestNote">Sign in later to keep your Favorites with your account.</p> : null}
    </section>
  );
}

function FavoritesLoading({ label }: { label: string }) {
  return <div className="favoritesLoading" role="status" aria-live="polite"><span>{label}</span><i /><i /><i /></div>;
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
    <div className="favoritesUnavailableOnly">
      {[...productIds.map((id) => ({ itemType: "product" as const, itemId: id })), ...lookIds.map((id) => ({ itemType: "look" as const, itemId: id }))].map((item) => <UnavailableFavoriteCard {...item} key={`${item.itemType}-${item.itemId}`} />)}
    </div>
  );
}

function UnavailableFavoriteCard({ itemType, itemId }: { itemType: "product" | "look"; itemId: string }) {
  return (
    <article className="favoriteUnavailableCard">
      <FavoriteButton itemType={itemType} itemId={itemId} itemName="saved item" variant="card" className="favoriteUnavailableCard__button" />
      <strong>This saved item is no longer available.</strong>
      <p>Remove it from your Favorites or keep it saved in case it returns.</p>
    </article>
  );
}

function LookFavoriteCard({ look }: { look: ResolvedLookFavorite }) {
  return (
    <article className="favoriteLookCard">
      <div className="favoriteLookCard__media">
        <Image src={look.image.url} alt={look.image.alt || look.name} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized />
        <FavoriteButton itemType="look" itemId={look.id} itemName={look.name} variant="card" className="favoriteLookCard__favorite" />
      </div>
      <div className="favoriteLookCard__body">
        <span>{look.productCount} PRODUCT{look.productCount === 1 ? "" : "S"}</span>
        <h3>{look.name}</h3>
        {look.description ? <p>{look.description}</p> : null}
        <LookPriceDisplay priceDzd={look.priceDzd} compareAtPriceDzd={look.compareAtPriceDzd} discountPercent={look.discountPercent} isPromo={look.isPromo} savingsLabel="" />
        <Link href={look.href} aria-label={`View ${look.name}`}>VIEW LOOK <span>→</span></Link>
      </div>
    </article>
  );
}
