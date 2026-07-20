"use client";

import { useRef, useState } from "react";
import { CommunityImageFrame } from "@/components/community/CommunityImageFrame";
import type { CommunityEntry } from "@/components/community/CommunityMarquee";

const PAGE_SIZE = 9;

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
            <CommunityImageFrame src={entry.image} alt={entry.alt} sizes="(max-width: 700px) 100vw, (max-width: 1180px) 50vw, 33vw" />
            <div className="communityPost__meta">
              <span>APPROVED</span>
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
