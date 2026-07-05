import type { StaticProduct } from "@/constants/products";

const defaultHighlights = ["Soft cotton feel", "Designed for daily wear", "213 RUN print", "Made for movement"];

type ProductDetailsProps = {
  product: StaticProduct;
};

const infoBlocks = [
  { title: "Details", copy: "Soft everyday piece built for movement, layering, and daily wear." },
  { title: "Fit", copy: "Relaxed oversized fit. Choose your usual size for a loose look." },
  { title: "Delivery", copy: "Delivery available across Algeria. More delivery logic will be added later." },
];

export function ProductDetails({ product }: ProductDetailsProps) {
  return (
    <section className="productDetails" aria-labelledby="product-details-title">
      <div>
        <span className="section-number">02</span>
        <h2 id="product-details-title">PRODUCT DETAILS</h2>
      </div>
      <div className="productDetails__grid">
        <article>
          <h3>Highlights</h3>
          <ul>
            {(product.details ?? defaultHighlights).map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
        </article>
        {infoBlocks.map((block) => (
          <article id={block.title === "Fit" ? "product-fit" : undefined} key={block.title}>
            <h3>{block.title}</h3>
            <p>{block.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
