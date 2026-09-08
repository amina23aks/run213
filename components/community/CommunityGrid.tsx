"use client";

import { useEffect, useRef, useState } from "react";
import { CommunityImageFrame } from "@/components/community/CommunityImageFrame";
import type { CommunityEntry } from "@/components/community/CommunityMarquee";

const PAGE_SIZE = 12;

type CommunityGridProps = {
  entries: CommunityEntry[];
};

export function CommunityGrid({ entries }: CommunityGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedEntry, setSelectedEntry] = useState<CommunityEntry | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  useEffect(() => {
    if (!selectedEntry) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedEntry(null);
      if (event.key === "Tab") { event.preventDefault(); closeRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocusRef.current?.focus(); };
  }, [selectedEntry]);

  if (entries.length === 0) {
    return <p className="communityGridEmpty">No community posts yet. Be the first to show up.</p>;
  }

  return (
    <div className="communityGridShell">
      <div className="communityGrid">
        {visibleEntries.map((entry) => (
          <article className="communityPost" key={entry.id}>
            <button className="communityPost__open" type="button" aria-label={`View run from ${entry.name}`} onClick={() => setSelectedEntry(entry)}>
            <CommunityImageFrame src={entry.image} alt={entry.alt} sizes="(max-width: 339px) 50vw, (max-width: 767px) 33vw, (max-width: 1199px) 30vw, 200px" variant="grid" fit={entry.imageFit ?? "cover"} />
            <div className="communityPost__meta">
              {entry.isWinner ? <b className="communityWinnerBadge">{entry.winnerPlacement ? `WINNER ${String(entry.winnerPlacement).padStart(2, "0")}` : "MONTHLY WINNER"}</b> : null}
              <strong>{entry.name}</strong>
              <small>{[entry.city, entry.approvedDate].filter(Boolean).join(" · ")}</small>
              {entry.caption ? <p>{entry.caption}</p> : null}
            </div>
            </button>
          </article>
        ))}
      </div>
      {hasMore ? (
        <button
          className="button communityGridLoadMore"
          type="button"
          onClick={() => {
            setVisibleCount((count) => Math.min(count + PAGE_SIZE, entries.length));
            window.requestAnimationFrame(() => statusRef.current?.focus());
          }}
        >
          LOAD MORE <span>→</span>
        </button>
      ) : <p className="communityGridLoaded" ref={statusRef} tabIndex={-1}>All community posts loaded.</p>}
      {selectedEntry ? (
        <div className="communityDetailModal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedEntry(null); }}>
          <section className="communityDetailModal__dialog" role="dialog" aria-modal="true" aria-labelledby="community-detail-title">
            <button ref={closeRef} className="communityDetailModal__close" type="button" aria-label="Close community detail" onClick={() => setSelectedEntry(null)}>×</button>
            <CommunityImageFrame src={selectedEntry.image} alt={selectedEntry.alt} sizes="(max-width: 700px) 92vw, 520px" fit="contain" />
            <div className="communityDetailModal__copy">
              {selectedEntry.isWinner ? <b className="communityWinnerBadge">{selectedEntry.winnerPlacement ? `WINNER ${String(selectedEntry.winnerPlacement).padStart(2, "0")}` : "MONTHLY WINNER"}</b> : null}
              <h2 id="community-detail-title">{selectedEntry.name}</h2>
              <small>{[selectedEntry.city, selectedEntry.approvedDate].filter(Boolean).join(" · ")}</small>
              {selectedEntry.caption ? <p>{selectedEntry.caption}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
