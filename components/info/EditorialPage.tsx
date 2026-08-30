import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function EditorialPage({ eyebrow = "213 RUN / INFO", title, updated, children }: { eyebrow?: string; title: string; updated?: string; children: ReactNode }) {
  return <><Header /><main className="editorialPage"><article><header><span>{eyebrow}</span><h1>{title}</h1>{updated ? <p>Last updated: {updated}</p> : null}</header><div className="editorialPage__content">{children}</div></article></main><div className="club-footer-shell"><Footer /></div></>;
}

export function EditorialSection({ title, children }: { title: string; children: ReactNode }) { return <section><h2>{title}</h2>{children}</section>; }
