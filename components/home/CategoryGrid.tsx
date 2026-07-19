import Image from "next/image";
import { categoryCards } from "@/constants/home";
import { getShopCategoryHref } from "@/constants/shop";

const categoryImage: Record<string, string> = {
  TOPS: "/top.png",
  BOTTOMS: "/buttom.png",
  ACCESSORIES: "/accs.png",
};

export function CategoryGrid() {
  return (
    <section className="home-section category-section" id="shop" aria-labelledby="category-title">
      <aside className="section-intro">
        <h2 id="category-title">SHOP BY CATEGORY</h2>
        <p>Shop the essentials.<br />Built for your run.</p>
      </aside>
      <div className="category-row">
        {categoryCards.map((category) => (
          <a className="category-card" href={getShopCategoryHref(category)} key={category}>
            <Image src={categoryImage[category]} alt={`${category} category`} width={680} height={420} />
            <strong>{category}</strong>
            <span>→</span>
          </a>
        ))}
      </div>
    </section>
  );
}
