"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLookPromoState } from "@/components/look/LookPriceDisplay";
import { getLookHref } from "@/lib/look-urls";
import { usePrefersReducedMotion } from "@/lib/motion";
import type { Look, LookCollection } from "@/types/look";

const AUTO_TICK_MS = 24;
const DESKTOP_STEP_PX = 0.35;
const MOBILE_STEP_PX = 0.2;
const USER_PAUSE_MS = 7_000;
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
  const resetTimerRef = useRef<number | null>(null);
  const userPauseTimerRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const isUserPausedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const renderedFigures = useMemo(() => hasOverflow ? [...figures, ...figures] : figures, [figures, hasOverflow]);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current === null) return;
    window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  const getFigureStep = useCallback(() => {
    const row = rowRef.current;
    const firstCard = row?.querySelector<HTMLElement>(".figure-card");
    if (!row || !firstCard) return 0;
    const gap = Number.parseFloat(window.getComputedStyle(row).columnGap || window.getComputedStyle(row).gap || "0");
    return firstCard.getBoundingClientRect().width + (Number.isFinite(gap) ? gap : 0);
  }, []);

  const updateScrollState = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const naturalWidth = hasOverflow ? row.scrollWidth / 2 : row.scrollWidth;
    const overflow = naturalWidth > row.clientWidth + 2;
    const step = getFigureStep();
    setHasOverflow(overflow);
    setCanScrollPrev(overflow && row.scrollLeft > 2);
    setCanScrollNext(overflow);
    if (step > 0 && figures.length > 0) {
      const normalizedScroll = row.scrollLeft % Math.max(naturalWidth, 1);
      setActiveFigure(Math.min(Math.round(normalizedScroll / step), figures.length - 1));
    }
  }, [figures.length, getFigureStep, hasOverflow]);

  const pauseAfterInteraction = useCallback(() => {
    isUserPausedRef.current = true;
    if (userPauseTimerRef.current !== null) window.clearTimeout(userPauseTimerRef.current);
    userPauseTimerRef.current = window.setTimeout(() => { isUserPausedRef.current = false; }, USER_PAUSE_MS);
  }, []);

  const scrollByFigure = useCallback((direction: -1 | 1) => {
    const row = rowRef.current;
    const step = getFigureStep();
    if (!row || step <= 0) return;
    clearResetTimer();
    pauseAfterInteraction();
    row.scrollBy({ left: direction * step, behavior: "smooth" });
  }, [clearResetTimer, getFigureStep, pauseAfterInteraction]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(row);
    Array.from(row.children).forEach((child) => resizeObserver.observe(child));
    window.addEventListener("resize", updateScrollState);
    let rafTwo: number | null = null;
    const rafOne = window.requestAnimationFrame(() => {
      updateScrollState();
      rafTwo = window.requestAnimationFrame(updateScrollState);
    });
    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(rafOne);
      if (rafTwo !== null) window.cancelAnimationFrame(rafTwo);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [figures.length, updateScrollState]);

  useEffect(() => {
    if (!figures.length || !hasOverflow || prefersReducedMotion) return undefined;
    const interval = window.setInterval(() => {
      const row = rowRef.current;
      if (!row || document.hidden || isPausedRef.current || isUserPausedRef.current) return;
      const resetPoint = row.scrollWidth / 2;
      const step = window.innerWidth < 700 ? MOBILE_STEP_PX : DESKTOP_STEP_PX;
      if (resetPoint <= row.clientWidth + 2) return;
      if (row.scrollLeft >= resetPoint) row.scrollLeft -= resetPoint;
      else row.scrollLeft += step;
    }, AUTO_TICK_MS);
    return () => window.clearInterval(interval);
  }, [figures.length, hasOverflow, prefersReducedMotion]);

  useEffect(() => () => {
    clearResetTimer();
    if (userPauseTimerRef.current !== null) window.clearTimeout(userPauseTimerRef.current);
  }, [clearResetTimer]);

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
          <div className="figure-row" aria-label="Shop the look figures" ref={rowRef} onScroll={updateScrollState} onPointerDown={pauseAfterInteraction} onWheel={pauseAfterInteraction}>
            {renderedFigures.map((figure, renderedIndex) => {
              const originalIndex = renderedIndex % Math.max(figures.length, 1);
              const isDuplicate = renderedIndex >= figures.length;
              const promo = getLookPromoState(figure);
              const displayTitle = `${String(originalIndex + 1).padStart(2, "0")}. ${figure.name}`;
              return (
                <Link
                  aria-hidden={isDuplicate || undefined}
                  className={originalIndex === activeFigure ? "figure-card is-active" : "figure-card"}
                  href={getLookHref(figure)}
                  key={`${figure.id}-${isDuplicate ? "duplicate" : "original"}`}
                  onFocus={() => { setActiveFigure(originalIndex); }}
                  onMouseEnter={() => { setActiveFigure(originalIndex); }}
                  onClick={pauseAfterInteraction}
                  tabIndex={isDuplicate ? -1 : undefined}
                  title={displayTitle}
                >
                  <span className="figure-card__title">{displayTitle}</span>
                  {promo.isValidPromo ? <span className="figure-card__promo">PROMO <b>-{promo.discountPercent}%</b></span> : null}
                  <Image src={(figure.figureImage ?? figure.heroImage).url} alt={(figure.figureImage ?? figure.heroImage).alt || displayTitle} width={260} height={360} onLoad={updateScrollState} unoptimized />
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
