"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getLookPromoState } from "@/components/look/LookPriceDisplay";
import { usePrefersReducedMotion } from "@/lib/motion";
import type { Look, LookCollection } from "@/types/look";

const AUTO_SLIDE_MS = 5_500;
const USER_PAUSE_MS = 9_000;
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
  const figureRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const pauseUntilRef = useRef(0);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasFigures = figures.length > 0;

  const updateScrollState = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const overflow = row.scrollWidth > row.clientWidth + 2;
    setHasOverflow(overflow);
    setCanScrollPrev(overflow && row.scrollLeft > 2);
    setCanScrollNext(overflow && row.scrollLeft + row.clientWidth < row.scrollWidth - 2);
  }, []);

  const pauseAfterInteraction = () => {
    pauseUntilRef.current = Date.now() + USER_PAUSE_MS;
  };

  const scrollToFigure = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const row = rowRef.current;
    const target = figureRefs.current[index];
    if (!row || !target) return;
    row.scrollTo({ left: target.offsetLeft - row.offsetLeft, behavior });
  }, []);

  const activateFigure = useCallback((index: number, shouldPause = true) => {
    if (!hasFigures) return;
    const nextIndex = (index + figures.length) % figures.length;
    if (shouldPause) pauseAfterInteraction();
    setActiveFigure(nextIndex);
    scrollToFigure(nextIndex);
  }, [figures.length, hasFigures, scrollToFigure]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    updateScrollState();
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(row);
    window.addEventListener("resize", updateScrollState);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [figures.length, updateScrollState]);

  useEffect(() => {
    if (!hasFigures || !hasOverflow || prefersReducedMotion) return undefined;
    const interval = window.setInterval(() => {
      if (document.hidden || isPausedRef.current || isDraggingRef.current || Date.now() < pauseUntilRef.current) return;
      const nextIndex = activeFigure >= figures.length - 1 ? 0 : activeFigure + 1;
      setActiveFigure(nextIndex);
      scrollToFigure(nextIndex);
    }, AUTO_SLIDE_MS);
    return () => window.clearInterval(interval);
  }, [activeFigure, figures.length, hasFigures, hasOverflow, prefersReducedMotion, scrollToFigure]);

  return (
    <section className="home-section shopLookSection" id="shop-the-look" aria-labelledby="look-title">
      <aside className="section-intro shopLookIntro">
        <span className="section-number">03</span>
        <h2 id="look-title">SHOP THE LOOK</h2>
        <i className="section-lime-line" aria-hidden="true" />
        <p>Looks made to<br />move with you.</p>
      </aside>

      <div className="shopLookFigures">
        <div
          className={hasOverflow ? "figure-showcase has-overflow" : "figure-showcase"}
          onMouseEnter={() => { isPausedRef.current = true; }}
          onMouseLeave={() => { isPausedRef.current = false; }}
          onFocusCapture={() => { isPausedRef.current = true; }}
          onBlurCapture={() => { isPausedRef.current = false; }}
        >
          {hasOverflow ? <button className="figure-nav figure-nav--prev" type="button" aria-label="Scroll to previous looks" disabled={!canScrollPrev} onClick={() => activateFigure(activeFigure - 1)}>←</button> : null}
          <div
            className="figure-row"
            aria-label="Shop the look figures"
            ref={rowRef}
            onScroll={updateScrollState}
            onPointerDown={(event) => {
              if (!hasOverflow) return;
              isDraggingRef.current = true;
              pauseAfterInteraction();
              dragStartXRef.current = event.clientX;
              dragStartScrollRef.current = event.currentTarget.scrollLeft;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!isDraggingRef.current) return;
              event.currentTarget.scrollLeft = dragStartScrollRef.current - (event.clientX - dragStartXRef.current);
            }}
            onPointerUp={() => { isDraggingRef.current = false; pauseAfterInteraction(); updateScrollState(); }}
            onPointerCancel={() => { isDraggingRef.current = false; pauseAfterInteraction(); updateScrollState(); }}
          >
            {figures.map((figure, index) => {
              const promo = getLookPromoState(figure);
              return (
                <Link
                  className={index === activeFigure ? "figure-card is-active" : "figure-card"}
                  href={`/look/${figure.slug}`}
                  key={figure.id}
                  onFocus={() => { setActiveFigure(index); }}
                  onMouseEnter={() => { setActiveFigure(index); }}
                  onClick={pauseAfterInteraction}
                  ref={(node) => { figureRefs.current[index] = node; }}
                  title={figure.name}
                >
                  <span className="figure-card__title">{figure.name}</span>
                  {promo.isValidPromo ? <span className="figure-card__promo">PROMO <b>-{promo.discountPercent}%</b></span> : null}
                  <Image src={(figure.figureImage ?? figure.heroImage).url} alt={(figure.figureImage ?? figure.heroImage).alt} width={260} height={360} unoptimized />
                </Link>
              );
            })}
          </div>
          {hasOverflow ? <button className="figure-nav figure-nav--next" type="button" aria-label="Scroll to next looks" disabled={!canScrollNext} onClick={() => activateFigure(activeFigure + 1)}>→</button> : null}
        </div>
      </div>

      <div className="shopLookCards">
        {COLLECTION_SLOTS.map((slot, index) => {
          const collection = collections[index] ?? collections.find((item) => item.slug === slot.slug) ?? null;
          const content = (<>{collection ? <Image src={collection.cardImage.url} alt={collection.cardImage.alt} fill sizes="(max-width: 900px) 80vw, 25vw" unoptimized /> : <div className="look-card__placeholder" />}<span>{slot.number}</span><div><h3>{collection?.name ?? slot.name}</h3><p>{collection?.subtitle || slot.subtitle}</p></div><small className="look-card__arrow" aria-hidden="true">→</small></>);
          return collection ? <Link className="look-card" href={`/looks/${collection.slug}`} key={slot.slug}>{content}</Link> : <article className="look-card look-card--disabled" key={slot.slug}>{content}</article>;
        })}
      </div>
    </section>
  );
}
