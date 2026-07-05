"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { lookCards, lookFigures } from "@/constants/home";

const AUTO_SLIDE_MS = 4500;
const USER_PAUSE_MS = 7000;

export function ShopTheLook() {
  const [activeFigure, setActiveFigure] = useState(0);
  const pauseUntilRef = useRef(0);
  const isHoveringRef = useRef(false);

  const activateFigure = (index: number) => {
    pauseUntilRef.current = Date.now() + USER_PAUSE_MS;
    setActiveFigure((index + lookFigures.length) % lookFigures.length);
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (isHoveringRef.current || Date.now() < pauseUntilRef.current) return;
      setActiveFigure((current) => (current + 1) % lookFigures.length);
    }, AUTO_SLIDE_MS);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="home-section look-section" id="shop-the-look" aria-labelledby="look-title">
      <aside className="section-intro look-section__intro">
        <span className="section-number">03</span>
        <h2 id="look-title">SHOP THE LOOK</h2>
        <p>Looks made to<br />move with you.</p>
      </aside>
      <div className="look-area">
        <div className="figure-showcase" onMouseEnter={() => { isHoveringRef.current = true; }} onMouseLeave={() => { isHoveringRef.current = false; }}>
          <button className="figure-nav figure-nav--prev" type="button" aria-label="Previous look" onClick={() => activateFigure(activeFigure - 1)}>←</button>
          <div className="figure-row" aria-label="Shop the look figures">
            {lookFigures.map((figure, index) => (
              <button
                className={index === activeFigure ? "figure-card is-active" : "figure-card"}
                type="button"
                key={figure.name}
                onClick={() => activateFigure(index)}
              >
                <span>{figure.number}</span>
                <strong>{figure.name}</strong>
                <Image src="/model.png" alt={`${figure.name} outfit figure placeholder`} width={260} height={360} />
              </button>
            ))}
          </div>
          <button className="figure-nav figure-nav--next" type="button" aria-label="Next look" onClick={() => activateFigure(activeFigure + 1)}>→</button>
        </div>
      </div>
      <div className="look-card-row">
        {lookCards.map((look) => (
          <article className="look-card" key={look.name}>
            <Image src="/bottompart.png" alt={`${look.name} look placeholder`} width={680} height={383} />
            <span>{look.number}</span>
            <div>
              <h3>{look.name}</h3>
              <p>{look.description}</p>
            </div>
            <a href="#shop-the-look" aria-label={`Explore ${look.name}`}>→</a>
          </article>
        ))}
      </div>
    </section>
  );
}
