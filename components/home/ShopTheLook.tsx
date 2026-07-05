"use client";

import Image from "next/image";
import { useState } from "react";
import { lookCards, lookFigures } from "@/constants/home";

export function ShopTheLook() {
  const [activeFigure, setActiveFigure] = useState(0);

  return (
    <section className="home-section look-section" id="shop-the-look" aria-labelledby="look-title">
      <aside className="section-intro">
        <h2 id="look-title">SHOP THE LOOK</h2>
        <p>Looks made to<br />move with you.</p>
      </aside>
      <div className="look-area">
        <div className="figure-row" aria-label="Shop the look figures">
          {lookFigures.map((figure, index) => (
            <button
              className={index === activeFigure ? "figure-card is-active" : "figure-card"}
              type="button"
              key={figure.name}
              onClick={() => setActiveFigure(index)}
            >
              <span>{figure.number}</span>
              <strong>{figure.name}</strong>
              <Image src="/model.png" alt={`${figure.name} outfit figure placeholder`} width={260} height={360} />
            </button>
          ))}
        </div>
        <div className="look-card-row">
          {lookCards.map((look) => (
            <article className="look-card" key={look.name}>
              <Image src="/bottompart.png" alt={`${look.name} look placeholder`} width={560} height={315} />
              <span>{look.number}</span>
              <div>
                <h3>{look.name}</h3>
                <p>{look.description}</p>
              </div>
              <a href="#shop-the-look" aria-label={`Explore ${look.name}`}>→</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
