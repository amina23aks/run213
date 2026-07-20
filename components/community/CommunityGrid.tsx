"use client";

import { useRef, useState } from "react";
import { CommunityImageFrame } from "@/components/community/CommunityImageFrame";
import type { CommunityEntry } from "@/components/community/CommunityMarquee";

const PAGE_SIZE = 12;

type CommunityGridProps = {
  entries: CommunityEntry[];
};

export function CommunityGrid({ entries }: CommunityGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  if (entries.length === 0) {
    return <p className="communityGridEmpty">No community posts yet. Be the first to show up.</p>;
  }

  return (
    <div className="communityGridShell">
      <div className="communityGrid">
        {visibleEntries.map((entry) => (
          <article className="communityPost" key={entry.id}>
            <CommunityImageFrame src={entry.image} alt={entry.alt} sizes="(max-width: 339px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 30vw, 220px" variant="grid" />
            <div className="communityPost__meta">
              <strong>{entry.name}</strong>
              <small>{[entry.city, entry.approvedDate].filter(Boolean).join(" · ")}</small>
              {entry.caption ? <p>{entry.caption}</p> : null}
            </div>
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
    </div>
  );
}
