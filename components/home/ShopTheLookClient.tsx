"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getLookPromoState } from "@/components/look/LookPriceDisplay";
import { getLookHref } from "@/lib/look-urls";
import { usePrefersReducedMotion } from "@/lib/motion";
import type { Look, LookCollection } from "@/types/look";

const AUTO_ADVANCE_MS = 4_000;
const END_RESET_PAUSE_MS = 1_250;
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
  const isResettingRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

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
    const overflow = row.scrollWidth > row.clientWidth + 2;
    const maxScroll = Math.max(row.scrollWidth - row.clientWidth, 0);
    const step = getFigureStep();
    setHasOverflow(overflow);
    setCanScrollPrev(overflow && row.scrollLeft > 2);
    setCanScrollNext(overflow && row.scrollLeft < maxScroll - 2);
    if (step > 0) setActiveFigure(Math.min(Math.round(row.scrollLeft / step), Math.max(figures.length - 1, 0)));
  }, [figures.length, getFigureStep]);

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
    const rafOne = window.requestAnimationFrame(() => {
      updateScrollState();
      window.requestAnimationFrame(updateScrollState);
    });
    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(rafOne);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [figures.length, updateScrollState]);

  useEffect(() => {
    if (!figures.length || !hasOverflow || prefersReducedMotion) return undefined;
    const interval = window.setInterval(() => {
      const row = rowRef.current;
      const step = getFigureStep();
      if (!row || step <= 0 || document.hidden || isPausedRef.current || isUserPausedRef.current || isResettingRef.current) return;
      const maxScroll = Math.max(row.scrollWidth - row.clientWidth, 0);
      if (row.scrollLeft >= maxScroll - step * 0.5) {
        clearResetTimer();
        isResettingRef.current = true;
        resetTimerRef.current = window.setTimeout(() => {
          row.scrollTo({ left: 0, behavior: "smooth" });
          window.setTimeout(() => { isResettingRef.current = false; }, 450);
        }, END_RESET_PAUSE_MS);
        return;
      }
      row.scrollBy({ left: Math.min(step, maxScroll - row.scrollLeft), behavior: "smooth" });
    }, AUTO_ADVANCE_MS);
    return () => {
      window.clearInterval(interval);
      clearResetTimer();
    };
  }, [clearResetTimer, figures.length, getFigureStep, hasOverflow, prefersReducedMotion]);

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
            {figures.map((figure, index) => {
              const promo = getLookPromoState(figure);
              const displayTitle = `${String(index + 1).padStart(2, "0")}. ${figure.name}`;
              return (
                <Link
                  className={index === activeFigure ? "figure-card is-active" : "figure-card"}
                  href={getLookHref(figure)}
                  key={figure.id}
                  onFocus={() => { setActiveFigure(index); }}
                  onMouseEnter={() => { setActiveFigure(index); }}
                  onClick={pauseAfterInteraction}
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
