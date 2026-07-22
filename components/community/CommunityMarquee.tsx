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
  imagePublicId?: string | null;
  isWinner?: boolean;
  winnerPlacement?: number;
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
  const uniqueEntries = useMemo(() => {
    const byId = new Map<string, CommunityEntry>();
    const byPublicId = new Map<string, CommunityEntry>();
    const isNewer = (next: CommunityEntry, current?: CommunityEntry) => !current || new Date(next.approvedDate).getTime() >= new Date(current.approvedDate).getTime();
    entries.forEach((entry) => {
      if (isNewer(entry, byId.get(entry.id))) byId.set(entry.id, entry);
    });
    byId.forEach((entry) => {
      const publicId = entry.imagePublicId?.trim();
      if (!publicId || isNewer(entry, byPublicId.get(publicId))) byPublicId.set(publicId || `id:${entry.id}`, entry);
    });
    return Array.from(byPublicId.values()).sort((a, b) => new Date(b.approvedDate).getTime() - new Date(a.approvedDate).getTime());
  }, [entries]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    const update = () => setCanAnimate(uniqueEntries.length > 1 && row.scrollWidth > row.clientWidth + 2);
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
      const maxScroll = row.scrollWidth - row.clientWidth;
      const step = window.innerWidth < 700 ? 0.35 : 0.55;
      if (row.scrollLeft >= maxScroll - 1) { row.scrollLeft = 0; pauseUntilRef.current = Date.now() + 1_200; }
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
        {uniqueEntries.map((entry) => (
          <article className="communityCard" key={entry.id}>
            <CommunityImageFrame src={entry.image} alt={entry.alt} sizes={compact ? "220px" : "280px"} variant="marquee" fit={entry.imageFit ?? "cover"} />
            <div className="communityCard__meta">{entry.isWinner ? <b className="communityWinnerBadge">{entry.winnerPlacement ? `WINNER ${String(entry.winnerPlacement).padStart(2, "0")}` : "MONTHLY WINNER"}</b> : null}<strong>{entry.name}</strong><span>{[entry.city, entry.isWinner ? "MONTHLY WINNER" : entry.label].filter(Boolean).join(" · ")}</span><small>{entry.approvedDate}</small></div>
          </article>
        ))}
      </div>
    </div>
  );
}
