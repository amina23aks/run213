"use client";

import { useMemo, useState } from "react";
import { ShopGrid } from "@/components/shop/ShopGrid";
import type { Product, ProductCategory } from "@/types/product";

const INITIAL_BATCH_SIZE = 12;
const LOAD_MORE_SIZE = 12;

const filters: { label: string; value: ProductCategory | "all" }[] = [
  { label: "ALL PRODUCTS", value: "all" },
  { label: "T-SHIRTS", value: "tshirts" },
  { label: "PANTS", value: "pants" },
  { label: "HOODIES", value: "hoodies" },
  { label: "ACCESSORIES", value: "accessories" },
];

export function ShopBrowser({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery = !normalizedQuery || [product.name, product.description].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredProducts.length;

  function updateCategory(nextCategory: ProductCategory | "all") {
    setCategory(nextCategory);
    setVisibleCount(INITIAL_BATCH_SIZE);
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setVisibleCount(INITIAL_BATCH_SIZE);
  }

  return (
    <>
      <div className="shopControls">
        <form className="shopSearch" action="#" role="search" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>Search products</span>
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
            <input type="search" placeholder="Search products..." value={query} onChange={(event) => updateQuery(event.target.value)} />
          </label>
        </form>
        <section className="shopFilters" aria-label="Product categories">
          {filters.map((filter) => <button className={category === filter.value ? "is-active" : undefined} key={filter.value} type="button" onClick={() => updateCategory(filter.value)}>{filter.label}</button>)}
        </section>
      </div>
      <ShopGrid products={visibleProducts} />
      {canLoadMore ? <div className="shopLoadMore"><button type="button" onClick={() => setVisibleCount((current) => current + LOAD_MORE_SIZE)}>LOAD MORE <span>→</span></button></div> : null}
    </>
  );
}
