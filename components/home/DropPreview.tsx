import Image from "next/image";

const products = [
  "Built. Not Found. Tee",
  "Run Your Pace Tee",
  "Discipline Hoodie",
  "Baggy Open Leg",
];

export function DropPreview() {
  return (
    <section className="section drop" id="drop-001" aria-labelledby="drop-title">
      <div className="section__heading">
        <p className="eyebrow">DROP_001</p>
        <h2 id="drop-title">BUILT. NOT FOUND.</h2>
        <p>First pieces for the runners who show up.</p>
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product}>
            <Image src="/media/placeholders/product-placeholder.webp" alt={`${product} placeholder`} width={640} height={800} />
            <div>
              <p>{product}</p>
              <span>DROP_001</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
