"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Look, LookCollection } from "@/types/look";

const AUTO_SLIDE_MS = 4500;
const USER_PAUSE_MS = 7000;

type ShopTheLookClientProps = {
  figures: Look[];
  collections: LookCollection[];
};

export function ShopTheLookClient({ figures, collections }: ShopTheLookClientProps) {
  const [activeFigure, setActiveFigure] = useState(0);
  const pauseUntilRef = useRef(0);
  const isHoveringRef = useRef(false);
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
        <p>Looks made to<br />move with you.</p>
      </aside>

      {hasFigures ? (
        <div className="shopLookFigures">
          <div className="figure-showcase" onMouseEnter={() => { isHoveringRef.current = true; }} onMouseLeave={() => { isHoveringRef.current = false; }}>
            <button className="figure-nav figure-nav--prev" type="button" aria-label="Previous look" onClick={() => activateFigure(activeFigure - 1)}>←</button>
            <div className="figure-row" aria-label="Shop the look figures">
              {figures.map((figure, index) => (
                <Link className={index === activeFigure ? "figure-card is-active" : "figure-card"} href={`/look/${figure.slug}`} key={figure.id} onFocus={() => activateFigure(index)} onMouseEnter={() => activateFigure(index)}>
                  <span>{figure.numberLabel ?? String(index + 1).padStart(2, "0")}</span>
                  <strong>{figure.name}</strong>
                  <Image src={figure.heroImage.url} alt={figure.heroImage.alt} width={260} height={360} unoptimized />
                </Link>
              ))}
            </div>
            <button className="figure-nav figure-nav--next" type="button" aria-label="Next look" onClick={() => activateFigure(activeFigure + 1)}>→</button>
          </div>
          {activeLook ? <Link className="shopLookActiveLink" href={`/look/${activeLook.slug}`}>VIEW {activeLook.numberLabel ?? "LOOK"} →</Link> : null}
        </div>
      ) : (
        <div className="shopLookEmpty"><strong>No looks configured yet.</strong><span>Create active Looks and enable homepage figure display.</span></div>
      )}

      <div className="shopLookCards">
        {collections.length ? collections.map((collection, index) => (
          <Link className="look-card" href={`/looks/${collection.slug}`} key={collection.id}>
            <Image src={collection.cardImage.url} alt={collection.cardImage.alt} width={680} height={383} unoptimized />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{collection.name}</h3>
              <p>{collection.subtitle}</p>
            </div>
            <small aria-hidden="true">→</small>
          </Link>
        )) : <div className="shopLookEmpty shopLookEmpty--cards"><strong>No look collections yet.</strong><span>Active collections will appear here.</span></div>}
      </div>
    </section>
  );
}
