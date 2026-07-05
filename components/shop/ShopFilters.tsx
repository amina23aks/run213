import { shopFilters } from "@/constants/products";

export function ShopFilters() {
  return (
    <section className="shopFilters" aria-label="Product categories">
      {shopFilters.map((filter) => (
        <button className={filter === "All" ? "is-active" : undefined} key={filter} type="button">
          {filter}
        </button>
      ))}
    </section>
  );
}
