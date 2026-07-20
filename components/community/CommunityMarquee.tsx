"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

export type CommunityEntry = {
  id: string;
  name: string;
  city?: string;
  label?: string;
  approvedDate: string;
  image: string;
  alt: string;
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

  useEffect(() => {
    const update = () => {
      const row = rowRef.current;
      setCanAnimate(Boolean(row && row.scrollWidth > row.clientWidth + 2));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [entries.length]);

  useEffect(() => {
    if (prefersReducedMotion || !canAnimate) return undefined;
    const tick = window.setInterval(() => {
      const row = rowRef.current;
      if (!row || document.hidden || isPausedRef.current || isDraggingRef.current || Date.now() < pauseUntilRef.current) return;
      const step = window.innerWidth < 700 ? 0.45 : 0.7;
      if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 2) row.scrollTo({ left: 0 });
      else row.scrollLeft += step;
    }, 32);
    return () => window.clearInterval(tick);
  }, [canAnimate, prefersReducedMotion]);

  const pauseAfterInteraction = () => { pauseUntilRef.current = Date.now() + 4000; };

  return (
    <div
      className={compact ? "communityMarquee communityMarquee--compact" : "communityMarquee"}
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
      onFocusCapture={() => { isPausedRef.current = true; }}
      onBlurCapture={() => { isPausedRef.current = false; }}
    >
      <div
        className="communityMarquee__row"
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
        {entries.map((entry) => (
          <article className="communityCard" key={entry.id}>
            <Image src={entry.image} alt={entry.alt} width={compact ? 260 : 340} height={compact ? 190 : 250} sizes={compact ? "260px" : "(max-width: 700px) 76vw, 340px"} />
            <div><strong>{entry.name}</strong><span>{[entry.city, entry.label].filter(Boolean).join(" · ")}</span><small>{entry.approvedDate}</small></div>
          </article>
        ))}
      </div>
    </div>
  );
}
