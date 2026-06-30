import Image from "next/image";

const looks = [
  { title: "Oversized Tee + Baggy Jogging", price: "Complete fit preview" },
  { title: "Regular Hoodie + Open Leg Pant", price: "Layered for movement" },
];

export function ShopTheLook() {
  return (
    <section className="section look" aria-labelledby="look-title">
      <div className="look__copy">
        <p className="eyebrow">Shop The Look</p>
        <h2 id="look-title">COMPLETE YOUR FIT.<br />MOVE TOGETHER.</h2>
        <p>Outfits made to feel consistent from warm-up to the rest of the day.</p>
      </div>
      <div className="look__cards">
        {looks.map((look) => (
          <article className="look-card" key={look.title}>
            <Image src="/media/placeholders/product-placeholder.webp" alt={`${look.title} outfit placeholder`} width={640} height={780} />
            <div>
              <h3>{look.title}</h3>
              <p>{look.price}</p>
              <a href="#drop-001">Shop the look</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
