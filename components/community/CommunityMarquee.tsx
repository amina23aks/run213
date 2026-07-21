"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CommunityImageFrame } from "@/components/community/CommunityImageFrame";
import { usePrefersReducedMotion } from "@/lib/motion";

export type CommunityEntry = {
  id: string;
  name: string;
  city?: string;
  label?: string;
  caption?: string;
  approvedDate: string;
  image: string;
  alt: string;
  imageFit?: "cover" | "contain";
};

type CommunityMarqueeProps = {
  entries: CommunityEntry[];
  compact?: boolean;
};

export function CommunityMarquee({ entries, compact = false }: CommunityMarqueeProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const pauseUntilRef = useRef(0);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const [canAnimate, setCanAnimate] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const uniqueEntries = useMemo(() => Array.from(new Map(entries.map((entry) => [entry.id, entry])).values()), [entries]);
  const renderedEntries = useMemo(() => (canAnimate && uniqueEntries.length >= 3 ? [...uniqueEntries, ...uniqueEntries] : uniqueEntries), [canAnimate, uniqueEntries]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    const update = () => setCanAnimate(uniqueEntries.length >= 3 && row.scrollWidth > row.clientWidth + 2);
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(row);
    window.addEventListener("resize", update);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [uniqueEntries.length]);

  useEffect(() => {
    if (prefersReducedMotion || !canAnimate) return undefined;
    const tick = window.setInterval(() => {
      const row = rowRef.current;
      if (!row || document.hidden || isPausedRef.current || isDraggingRef.current || Date.now() < pauseUntilRef.current) return;
      const resetPoint = row.scrollWidth / 2;
      const step = window.innerWidth < 700 ? 0.35 : 0.55;
      if (row.scrollLeft >= resetPoint) row.scrollLeft -= resetPoint;
      else row.scrollLeft += step;
    }, 24);
    return () => window.clearInterval(tick);
  }, [canAnimate, prefersReducedMotion]);

  const pauseAfterInteraction = () => { pauseUntilRef.current = Date.now() + 4_000; };

  return (
    <div
      className={compact ? "communityMarquee communityMarquee--compact" : "communityMarquee"}
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
      onFocusCapture={() => { isPausedRef.current = true; }}
      onBlurCapture={() => { isPausedRef.current = false; }}
    >
      <div
        className={`communityMarquee__row ${canAnimate ? "communityMarquee__row--animated" : "communityMarquee__row--static"}`}
        ref={rowRef}
        tabIndex={0}
        aria-label="Approved 213 RUN Club community gallery"
        onPointerDown={(event) => {
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
        onPointerUp={() => { isDraggingRef.current = false; pauseAfterInteraction(); }}
        onPointerCancel={() => { isDraggingRef.current = false; pauseAfterInteraction(); }}
      >
        {renderedEntries.map((entry, index) => {
          const isDuplicate = canAnimate && index >= uniqueEntries.length;
          return (
            <article className="communityCard" key={isDuplicate ? `${entry.id}-marquee-copy` : entry.id} aria-hidden={isDuplicate || undefined}>
              <CommunityImageFrame src={entry.image} alt={isDuplicate ? "" : entry.alt} sizes={compact ? "220px" : "280px"} variant="marquee" fit={entry.imageFit ?? "cover"} />
              <div className="communityCard__meta"><strong>{entry.name}</strong><span>{[entry.city, entry.label].filter(Boolean).join(" · ")}</span><small>{entry.approvedDate}</small></div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
