"use client";

import Image from "next/image";
import Link from "next/link";
import { MouseEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLookPromoState } from "@/components/look/LookPriceDisplay";
import { usePrefersReducedMotion } from "@/lib/motion";
import type { Look, LookCollection } from "@/types/look";

const AUTO_TICK_MS = 24;
const USER_PAUSE_MS = 9_000;
const DRAG_CANCEL_PX = 6;
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
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const shouldCancelClickRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasFigures = figures.length > 0;
  const renderedFigures = useMemo(() => hasOverflow ? [...figures, ...figures] : figures, [figures, hasOverflow]);

  const updateScrollState = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const loopWidth = hasOverflow ? row.scrollWidth / 2 : row.scrollWidth;
    const overflow = loopWidth > row.clientWidth + 2;
    setHasOverflow(overflow);
    setCanScrollPrev(overflow && row.scrollLeft > 2);
    setCanScrollNext(overflow);
    if (figures.length > 0) {
      const approximateIndex = Math.round((row.scrollLeft % Math.max(loopWidth, 1)) / Math.max(loopWidth / figures.length, 1));
      setActiveFigure(Math.min(approximateIndex, figures.length - 1));
    }
  }, [figures.length, hasOverflow]);

  const pauseAfterInteraction = () => {
    pauseUntilRef.current = Date.now() + USER_PAUSE_MS;
  };

  const scrollByFigure = (direction: -1 | 1) => {
    const row = rowRef.current;
    if (!row || figures.length === 0) return;
    pauseAfterInteraction();
    const figureWidth = row.scrollWidth / (hasOverflow ? figures.length * 2 : figures.length);
    row.scrollBy({ left: direction * figureWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(row);
    window.addEventListener("resize", updateScrollState);
    window.requestAnimationFrame(updateScrollState);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [figures.length, updateScrollState]);

  useEffect(() => {
    if (!hasFigures || !hasOverflow || prefersReducedMotion) return undefined;
    const interval = window.setInterval(() => {
      const row = rowRef.current;
      if (!row || document.hidden || isPausedRef.current || isDraggingRef.current || Date.now() < pauseUntilRef.current) return;
      const resetPoint = row.scrollWidth / 2;
      const step = window.innerWidth < 700 ? 0.22 : 0.36;
      if (row.scrollLeft >= resetPoint) row.scrollLeft -= resetPoint;
      else row.scrollLeft += step;
    }, AUTO_TICK_MS);
    return () => window.clearInterval(interval);
  }, [hasFigures, hasOverflow, prefersReducedMotion]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!hasOverflow) return;
    isDraggingRef.current = true;
    shouldCancelClickRef.current = false;
    dragDistanceRef.current = 0;
    pauseAfterInteraction();
    dragStartXRef.current = event.clientX;
    dragStartScrollRef.current = event.currentTarget.scrollLeft;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const distance = event.clientX - dragStartXRef.current;
    dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.abs(distance));
    if (dragDistanceRef.current > DRAG_CANCEL_PX) shouldCancelClickRef.current = true;
    event.currentTarget.scrollLeft = dragStartScrollRef.current - distance;
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    isDraggingRef.current = false;
    pauseAfterInteraction();
    updateScrollState();
  };

  const onFigureClick = (event: MouseEvent<HTMLAnchorElement>) => {
    pauseAfterInteraction();
    if (!shouldCancelClickRef.current) return;
    event.preventDefault();
    shouldCancelClickRef.current = false;
  };

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
          {hasOverflow ? <button className="figure-nav figure-nav--prev" type="button" aria-label="Scroll to previous looks" disabled={!canScrollPrev} onClick={() => scrollByFigure(-1)}>←</button> : null}
          <div className="figure-row" aria-label="Shop the look figures" ref={rowRef} onScroll={updateScrollState} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer}>
            {renderedFigures.map((figure, renderedIndex) => {
              const originalIndex = renderedIndex % Math.max(figures.length, 1);
              const isDuplicate = renderedIndex >= figures.length;
              const promo = getLookPromoState(figure);
              const displayTitle = `${String(originalIndex + 1).padStart(2, "0")}. ${figure.name}`;
              return (
                <Link
                  aria-hidden={isDuplicate || undefined}
                  className={originalIndex === activeFigure ? "figure-card is-active" : "figure-card"}
                  href={`/look/${figure.slug}`}
                  key={`${figure.id}-${isDuplicate ? "duplicate" : "original"}`}
                  onFocus={() => { setActiveFigure(originalIndex); }}
                  onMouseEnter={() => { setActiveFigure(originalIndex); }}
                  onClick={onFigureClick}
                  tabIndex={isDuplicate ? -1 : undefined}
                  title={displayTitle}
                >
                  <span className="figure-card__title">{displayTitle}</span>
                  {promo.isValidPromo ? <span className="figure-card__promo">PROMO <b>-{promo.discountPercent}%</b></span> : null}
                  <Image src={(figure.figureImage ?? figure.heroImage).url} alt={isDuplicate ? "" : (figure.figureImage ?? figure.heroImage).alt} width={260} height={360} unoptimized />
                </Link>
              );
            })}
          </div>
          {hasOverflow ? <button className="figure-nav figure-nav--next" type="button" aria-label="Scroll to next looks" disabled={!canScrollNext} onClick={() => scrollByFigure(1)}>→</button> : null}
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
