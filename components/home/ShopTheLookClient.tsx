"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getLookPromoState } from "@/components/look/LookPriceDisplay";
import type { Look, LookCollection } from "@/types/look";

const AUTO_ADVANCE_MS = 6500;
const USER_PAUSE_MS = 10000;
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
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const pauseUntilRef = useRef(0);
  const isHoveringRef = useRef(false);
  const isFocusedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const figureSlots = Array.from({ length: 4 }, (_, index) => figures[index] ?? null);
  const hasFigures = figures.length > 0;

  const pauseAfterManualInteraction = useCallback(() => {
    pauseUntilRef.current = Date.now() + USER_PAUSE_MS;
  }, []);

  const updateScrollState = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const maxScrollLeft = row.scrollWidth - row.clientWidth;
    const overflow = maxScrollLeft > 2;
    setHasOverflow(overflow);
    setCanScrollPrev(overflow && row.scrollLeft > 2);
    setCanScrollNext(overflow && row.scrollLeft < maxScrollLeft - 2);
  }, []);

  const scrollToFigure = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const row = rowRef.current;
    const target = row?.querySelector<HTMLElement>(`[data-figure-index="${index}"]`);
    if (!row || !target) return;
    const nextLeft = target.offsetLeft - (row.clientWidth - target.clientWidth) / 2;
    row.scrollTo({ left: Math.max(0, nextLeft), behavior });
  }, []);

  const activateFigure = useCallback((index: number, shouldPause = true) => {
    if (!hasFigures) return;
    const nextIndex = Math.max(0, Math.min(index, figures.length - 1));
    if (shouldPause) pauseAfterManualInteraction();
    setActiveFigure(nextIndex);
    if (hasOverflow) scrollToFigure(nextIndex);
  }, [figures.length, hasFigures, hasOverflow, pauseAfterManualInteraction, scrollToFigure]);

  const scrollByStep = useCallback((direction: "prev" | "next") => {
    if (!hasFigures) return;
    activateFigure(activeFigure + (direction === "next" ? 1 : -1));
  }, [activateFigure, activeFigure, hasFigures]);

  useEffect(() => {
    updateScrollState();
    const row = rowRef.current;
    if (!row) return undefined;
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(row);
    window.addEventListener("resize", updateScrollState);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [figures.length, updateScrollState]);

  useEffect(() => {
    if (!hasFigures || !hasOverflow) return undefined;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return undefined;
    const interval = window.setInterval(() => {
      if (document.hidden || isHoveringRef.current || isFocusedRef.current || isDraggingRef.current || Date.now() < pauseUntilRef.current) return;
      setActiveFigure((current) => {
        const next = current >= figures.length - 1 ? 0 : current + 1;
        window.requestAnimationFrame(() => scrollToFigure(next));
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(interval);
  }, [figures.length, hasFigures, hasOverflow, scrollToFigure]);

  return (
    <section className="home-section shopLookSection" id="shop-the-look" aria-labelledby="look-title">
      <aside className="section-intro shopLookIntro">
        <span className="section-number">03</span>
        <h2 id="look-title">SHOP THE LOOK</h2>
        <i className="section-lime-line" aria-hidden="true" />
        <p>Looks made to<br />move with you.</p>
      </aside>

      <div className="shopLookFigures">
        <div className="figure-showcase" onMouseEnter={() => { isHoveringRef.current = true; }} onMouseLeave={() => { isHoveringRef.current = false; }} onFocusCapture={() => { isFocusedRef.current = true; }} onBlurCapture={() => { isFocusedRef.current = false; }}>
          {hasOverflow ? <button className="figure-nav figure-nav--prev" type="button" aria-label="Previous look" disabled={!canScrollPrev} onClick={() => scrollByStep("prev")}>←</button> : null}
          <div className="figure-row" aria-label="Shop the look figures" ref={rowRef} onScroll={updateScrollState} onPointerDown={(event) => { if (!hasOverflow) return; isDraggingRef.current = true; dragStartXRef.current = event.clientX; dragStartScrollLeftRef.current = event.currentTarget.scrollLeft; pauseAfterManualInteraction(); }} onPointerMove={(event) => { if (!isDraggingRef.current || !hasOverflow) return; event.currentTarget.scrollLeft = dragStartScrollLeftRef.current - (event.clientX - dragStartXRef.current); }} onPointerUp={() => { isDraggingRef.current = false; pauseAfterManualInteraction(); }} onPointerCancel={() => { isDraggingRef.current = false; }}>
            {figureSlots.map((figure, index) => figure ? (
              <Link data-figure-index={index} className={index === activeFigure ? "figure-card is-active" : "figure-card"} href={`/look/${figure.slug}`} key={figure.id} onFocus={() => activateFigure(index)} onMouseEnter={() => activateFigure(index, false)} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); scrollByStep("next"); } if (event.key === "ArrowLeft") { event.preventDefault(); scrollByStep("prev"); } }}>
                <strong>{figure.name}</strong>
                {getLookPromoState(figure).isValidPromo ? <span className="figure-card__promo">PROMO <b>-{getLookPromoState(figure).discountPercent}%</b></span> : null}
                <Image src={(figure.figureImage ?? figure.heroImage).url} alt={(figure.figureImage ?? figure.heroImage).alt} width={260} height={360} unoptimized />
              </Link>
            ) : (
              <div className="figure-card figure-card--placeholder" key={`figure-placeholder-${index}`}>
                <strong>{COLLECTION_SLOTS[index]?.name ?? "LOOK"}</strong>
                <div className="figure-placeholder-surface" />
              </div>
            ))}
          </div>
          {hasOverflow ? <button className="figure-nav figure-nav--next" type="button" aria-label="Next look" disabled={!canScrollNext} onClick={() => scrollByStep("next")}>→</button> : null}
        </div>
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
              <small className="look-card__arrow" aria-hidden="true">→</small>
            </>
          );

          return collection ? <Link className="look-card" href={`/looks/${collection.slug}`} key={slot.slug}>{content}</Link> : <article className="look-card look-card--disabled" key={slot.slug}>{content}</article>;
        })}
      </div>
    </section>
  );
}
