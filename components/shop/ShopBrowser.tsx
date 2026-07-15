"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { isShopCategoryFilter, isShopCategoryGroup, SHOP_CATEGORY_FILTERS, SHOP_CATEGORY_GROUPS, type ShopCategoryFilter, type ShopCategoryGroup } from "@/constants/shop";
import type { Product } from "@/types/product";

const INITIAL_BATCH_SIZE = 12;
const LOAD_MORE_SIZE = 12;

export function ShopBrowser({ products }: { products: Product[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visibleState, setVisibleState] = useState({ key: "", count: INITIAL_BATCH_SIZE });
  const query = searchParams.get("q") ?? "";
  const groupParam = searchParams.get("group");
  const categoryParam = searchParams.get("category");
  const selectedGroup: ShopCategoryGroup | null = isShopCategoryGroup(groupParam) ? groupParam : null;
  const selectedCategory: ShopCategoryFilter = selectedGroup ? "all" : isShopCategoryFilter(categoryParam) ? categoryParam : "all";

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

  function updateUrl(next: { category?: ShopCategoryFilter; group?: ShopCategoryGroup | null; query?: string }) {
    const params = new URLSearchParams(searchParams.toString());
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
      <div className="shopControls">
        <form className="shopSearch" action="#" role="search" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>Search products</span>
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
            <input type="search" placeholder="Search products..." value={query} onChange={(event) => updateUrl({ query: event.target.value })} />
          </label>
        </form>
        <section className="shopFilters" aria-label="Product categories">
          {selectedGroup ? <button className="is-active" type="button" onClick={() => updateUrl({ group: null })}>{selectedGroup === "tops" ? "TOPS" : selectedGroup === "bottoms" ? "BOTTOMS" : "ACCESSORIES"}</button> : null}
          {SHOP_CATEGORY_FILTERS.map((filter) => <button className={!selectedGroup && selectedCategory === filter.value ? "is-active" : undefined} key={filter.value} type="button" onClick={() => updateUrl({ category: filter.value })}>{filter.label}</button>)}
        </section>
      </div>
      <ShopGrid products={visibleProducts} />
      {canLoadMore ? <div className="shopLoadMore"><button type="button" onClick={() => setVisibleState({ key: filterKey, count: visibleCount + LOAD_MORE_SIZE })}>LOAD MORE <span>→</span></button></div> : null}
    </>
  );
}
