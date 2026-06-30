import { brandName, slogan } from "@/constants/brand";

export default function Home() {
  return (
    <main className="foundation-page" aria-labelledby="home-title">
      <section className="foundation-hero">
        <p className="foundation-kicker">{brandName}</p>
        <h1 id="home-title">{slogan}</h1>
        <p className="foundation-copy">Sprint 0 foundation ready.</p>
        <span className="foundation-button" aria-label="Shop Drop 01">
          Shop Drop 01
        </span>
      </section>
    </main>
  );
}
