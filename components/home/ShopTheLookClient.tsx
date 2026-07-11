"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Look, LookCollection } from "@/types/look";

const AUTO_SLIDE_MS = 4500;
const USER_PAUSE_MS = 7000;
const COLLECTION_SLOTS = [
  { number: "01", slug: "summer-road", name: "SUMMER ROAD", subtitle: "Light. Fast. Unstoppable." },
  { number: "02", slug: "city-everyday", name: "CITY EVERYDAY", subtitle: "Movement in every moment." },
  { number: "03", slug: "evening-layer", name: "EVENING LAYER", subtitle: "Adapt. Reflect. Keep going." },
  { number: "04", slug: "essential-layers", name: "ESSENTIAL LAYERS", subtitle: "Built for every condition." },
] as const;

type ShopTheLookClientProps = {
  figures: Look[];
  collections: LookCollection[];
};

export function ShopTheLookClient({ figures, collections }: ShopTheLookClientProps) {
  const [activeFigure, setActiveFigure] = useState(0);
  const pauseUntilRef = useRef(0);
  const isHoveringRef = useRef(false);
  const figureSlots = Array.from({ length: 4 }, (_, index) => figures[index] ?? null);
  const hasFigures = figures.length > 0;
  const activeLook = hasFigures ? figures[activeFigure % figures.length] : null;

  const activateFigure = (index: number) => {
    if (!hasFigures) return;
    pauseUntilRef.current = Date.now() + USER_PAUSE_MS;
    setActiveFigure((index + figures.length) % figures.length);
  };

  useEffect(() => {
    if (!hasFigures) return undefined;
    const interval = window.setInterval(() => {
      if (isHoveringRef.current || Date.now() < pauseUntilRef.current) return;
      setActiveFigure((current) => (current + 1) % figures.length);
    }, AUTO_SLIDE_MS);
    return () => window.clearInterval(interval);
  }, [figures.length, hasFigures]);

  return (
    <section className="home-section shopLookSection" id="shop-the-look" aria-labelledby="look-title">
      <aside className="section-intro shopLookIntro">
        <span className="section-number">03</span>
        <h2 id="look-title">SHOP THE LOOK</h2>
        <i className="section-lime-line" aria-hidden="true" />
        <p>Looks made to<br />move with you.</p>
      </aside>

      <div className="shopLookFigures">
        <div className="figure-showcase" onMouseEnter={() => { isHoveringRef.current = true; }} onMouseLeave={() => { isHoveringRef.current = false; }}>
          <button className="figure-nav figure-nav--prev" type="button" aria-label="Previous look" onClick={() => activateFigure(activeFigure - 1)}>←</button>
          <div className="figure-row" aria-label="Shop the look figures">
            {figureSlots.map((figure, index) => figure ? (
              <Link className={index === activeFigure ? "figure-card is-active" : "figure-card"} href={`/look/${figure.slug}`} key={figure.id} onFocus={() => activateFigure(index)} onMouseEnter={() => activateFigure(index)}>
                <span>{figure.numberLabel ?? String(index + 1).padStart(2, "0")}</span>
                <strong>{figure.name}</strong>
                <Image src={figure.heroImage.url} alt={figure.heroImage.alt} width={260} height={360} unoptimized />
              </Link>
            ) : (
              <div className="figure-card figure-card--placeholder" key={`figure-placeholder-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{COLLECTION_SLOTS[index]?.name ?? "LOOK"}</strong>
                <div className="figure-placeholder-surface" />
              </div>
            ))}
          </div>
          <button className="figure-nav figure-nav--next" type="button" aria-label="Next look" onClick={() => activateFigure(activeFigure + 1)}>→</button>
        </div>
        {activeLook ? <Link className="shopLookActiveLink" href={`/look/${activeLook.slug}`}>VIEW {activeLook.numberLabel ?? "LOOK"} →</Link> : null}
      </div>

      <div className="shopLookCards">
        {COLLECTION_SLOTS.map((slot, index) => {
          const collection = collections[index] ?? collections.find((item) => item.slug === slot.slug) ?? null;
          const content = (
            <>
              {collection ? <Image src={collection.cardImage.url} alt={collection.cardImage.alt} fill sizes="(max-width: 900px) 80vw, 25vw" unoptimized /> : <div className="look-card__placeholder" />}
              <span>{slot.number}</span>
              <div>
                <h3>{collection?.name ?? slot.name}</h3>
                <p>{collection?.subtitle || slot.subtitle}</p>
              </div>
              <small aria-hidden="true">→</small>
            </>
          );

          return collection ? <Link className="look-card" href={`/looks/${collection.slug}`} key={slot.slug}>{content}</Link> : <article className="look-card look-card--disabled" key={slot.slug}>{content}</article>;
        })}
      </div>
    </section>
  );
}
