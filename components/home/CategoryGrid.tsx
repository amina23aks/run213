import Image from "next/image";

const categories = [
  "Regular Tee",
  "Oversized Tee",
  "Regular Hoodie",
  "Oversized Hoodie",
  "Baggy Open Leg",
  "Baggy Oversized Jogging",
];

export function CategoryGrid() {
  return (
    <section className="section" id="shop" aria-labelledby="category-title">
      <div className="section__heading section__heading--row">
        <div>
          <p className="eyebrow">Shop By Category</p>
          <h2 id="category-title">Built for the daily run.</h2>
        </div>
        <p>Clean staples. Active streetwear. No shortcuts.</p>
      </div>
      <div className="category-grid">
        {categories.map((category) => (
          <a className="category-card" href="#shop" key={category}>
            <Image src="/media/placeholders/product-placeholder.webp" alt={`${category} category placeholder`} width={560} height={680} />
            <span>{category}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
