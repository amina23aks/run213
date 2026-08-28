"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { EnsembleGrid } from "@/components/shop/EnsembleGrid";
import { isShopCategoryFilter, isShopCategoryGroup, SHOP_CATEGORY_FILTERS, SHOP_CATEGORY_GROUPS, type ShopCategoryFilter, type ShopCategoryGroup, type ShopMode } from "@/constants/shop";
import type { Product } from "@/types/product";
import type { Look } from "@/types/look";

export const INITIAL_BATCH_SIZE = 8;
export const LOAD_MORE_SIZE = 8;

export function ShopBrowser({ products, looks }: { products: Product[]; looks: Look[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visibleState, setVisibleState] = useState({ key: "", count: INITIAL_BATCH_SIZE });
  const query = searchParams.get("q") ?? "";
  const groupParam = searchParams.get("group");
  const categoryParam = searchParams.get("category");
  const isLocked = searchParams.get("locked") === "1";
  const mode: ShopMode = searchParams.get("mode") === "ensembles" ? "ensembles" : "products";
  const selectedGroup: ShopCategoryGroup | null = isShopCategoryGroup(groupParam) ? groupParam : null;
  const selectedCategory: ShopCategoryFilter = selectedGroup ? "all" : isShopCategoryFilter(categoryParam) ? categoryParam : "all";

  const filteredLooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return looks.filter((look) => !normalizedQuery || [look.name, look.description].some((value) => value.toLowerCase().includes(normalizedQuery)));
  }, [looks, query]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const groupCategories = selectedGroup ? SHOP_CATEGORY_GROUPS[selectedGroup] : null;
    return products.filter((product) => {
      const matchesCategory = groupCategories ? groupCategories.includes(product.category) : selectedCategory === "all" || product.category === selectedCategory;
      const matchesQuery = !normalizedQuery || [product.name, product.description].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [products, query, selectedCategory, selectedGroup]);

  const filterKey = `${query}|${selectedGroup ?? ""}|${selectedCategory}`;
  const visibleCount = visibleState.key === filterKey ? visibleState.count : INITIAL_BATCH_SIZE;
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredProducts.length;

  function updateUrl(next: { category?: ShopCategoryFilter; group?: ShopCategoryGroup | null; mode?: ShopMode; query?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.mode !== undefined) {
      if (next.mode === "ensembles") { params.set("mode", "ensembles"); params.delete("group"); params.delete("category"); }
      else params.delete("mode");
    }
    if (next.query !== undefined) {
      const trimmed = next.query.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
    }
    if (next.group !== undefined) {
      if (next.group) {
        params.set("group", next.group);
        params.delete("category");
      } else {
        params.delete("group");
      }
    }
    if (next.category !== undefined) {
      params.delete("group");
      if (next.category === "all") params.delete("category");
      else params.set("category", next.category);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  return (
    <>
      <div className={isLocked ? "shopControls shopControls--locked" : "shopControls"}>
        <form className="shopSearch" action="#" role="search" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>{mode === "ensembles" ? "Search ensembles" : "Search products"}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
            <input type="search" placeholder={mode === "ensembles" ? "Search ensembles..." : "Search products..."} value={query} onChange={(event) => updateUrl({ query: event.target.value })} />
          </label>
        </form>
        {isLocked ? null : <section className="shopFilters" aria-label="Shop categories">{selectedGroup && mode === "products" ? <button className="is-active" type="button" onClick={() => updateUrl({ group: null })}>{selectedGroup === "tops" ? "TOPS" : selectedGroup === "bottoms" ? "BOTTOMS" : "ACCESSORIES"}</button> : null}{SHOP_CATEGORY_FILTERS.map((filter) => <button className={mode === "products" && !selectedGroup && selectedCategory === filter.value ? "is-active" : undefined} key={filter.value} type="button" onClick={() => updateUrl({ mode: "products", category: filter.value })}>{filter.label}</button>)}<button className={mode === "ensembles" ? "is-active" : undefined} type="button" onClick={() => updateUrl({ mode: "ensembles" })}>ENSEMBLES</button></section>}
      </div>
      {mode === "ensembles" ? <EnsembleGrid looks={filteredLooks} /> : <ShopGrid products={visibleProducts} />}
      {mode === "products" && canLoadMore ? <div className="shopLoadMore"><button type="button" onClick={() => setVisibleState({ key: filterKey, count: visibleCount + LOAD_MORE_SIZE })}>LOAD MORE <span>→</span></button></div> : null}
    </>
  );
}
