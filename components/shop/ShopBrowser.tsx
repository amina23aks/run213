"use client";

import { useMemo, useState } from "react";
import { ShopGrid } from "@/components/shop/ShopGrid";
import type { Product, ProductCategory } from "@/types/product";

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
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery = !normalizedQuery || [product.name, product.description, product.slug].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);

  return (
    <>
      <div className="shopControls">
        <form className="shopSearch" action="#" role="search" onSubmit={(event) => event.preventDefault()}>
          <label><span>Search products</span><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg><input type="search" placeholder="Search products..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </form>
        <section className="shopFilters" aria-label="Product categories">{filters.map((filter) => <button className={category === filter.value ? "is-active" : undefined} key={filter.value} type="button" onClick={() => setCategory(filter.value)}>{filter.label}</button>)}</section>
      </div>
      <ShopGrid products={visibleProducts} />
    </>
  );
}
