"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export function LookMiniProductStrip({ children }: { children: ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const measure = useCallback(() => { const row = rowRef.current; if (row) setCanScrollNext(row.scrollLeft + row.clientWidth < row.scrollWidth - 2); }, []);
  useEffect(() => { const row = rowRef.current; if (!row) return; measure(); const observer = new ResizeObserver(measure); observer.observe(row); return () => observer.disconnect(); }, [measure]);
  function revealNext() { const row = rowRef.current; const card = row?.querySelector<HTMLElement>(".lookMiniProduct"); row?.scrollBy({ left: (card?.offsetWidth ?? 126) + 9, behavior: "smooth" }); }

  return <div className="lookMiniProductStrip">
    <div className="lookMiniProducts" ref={rowRef} onScroll={measure}>{children}</div>
    {canScrollNext ? <button className="lookMiniProductStrip__next" type="button" aria-label="Show more included products" onClick={revealNext}>&gt;</button> : null}
  </div>;
}
