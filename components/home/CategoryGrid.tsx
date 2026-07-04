import Image from "next/image";
import { categoryCards } from "@/constants/home";

export function CategoryGrid() {
  return (
    <section className="home-section category-section" id="shop" aria-labelledby="category-title">
      <aside className="section-intro">
        <span>02</span>
        <h2 id="category-title">SHOP BY CATEGORY</h2>
        <p>Shop the essentials.<br />Built for your run.</p>
      </aside>
      <div className="category-row">
        {categoryCards.map((category) => (
          <a className="category-card" href="#shop" key={category}>
            <Image src="/media/placeholders/product-placeholder.webp" alt={`${category} category placeholder`} width={680} height={420} />
            <strong>{category}</strong>
            <span>→</span>
          </a>
        ))}
      </div>
    </section>
  );
}
