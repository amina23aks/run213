"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Kind = "all" | "product" | "look";
type Item = { id: string; itemId: string; type: "product" | "look"; count: number; name: string; slug: string | null; status: string; imageUrl: string | null };
type Payload = { summary: { productSaves: number; lookSaves: number; totalSaves: number; mostSavedItem: string | null }; items: Item[]; nextCursor: string | null };

export function AdminFavoritesClient() {
  return <AdminShell title="Favorites" eyebrow="MERCHANDISING" description="Aggregate saves only. Customer identities stay private." compactHeader><AdminFavoritesWorkspace /></AdminShell>;
}

function AdminFavoritesWorkspace() {
  const [kind, setKind] = useState<Kind>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cursor: string | null = null, append = false) => {
    setLoading(true); setError("");
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (kind !== "all") params.set("type", kind);
      let response = await fetch(`/api/admin/favorites?${params}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) {
        const freshToken = await getToken(true);
        response = await fetch(`/api/admin/favorites?${params}`, { cache: "no-store", headers: { Authorization: `Bearer ${freshToken}` } });
      }
      if (!response.ok) throw new Error(`Favorites insights could not be loaded (${response.status}).`);
      const next = await response.json() as Payload;
      setData((current) => append && current ? { ...next, summary: current.summary, items: [...current.items, ...next.items] } : next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Favorites insights could not be loaded."); }
    finally { setLoading(false); }
  }, [kind]);

  useEffect(() => { const task = queueMicrotask(() => void load()); return () => void task; }, [load]);
  return (
    <>
        <div className="adminInsightStats">
          <Stat label="TOTAL PRODUCT SAVES" value={data?.summary.productSaves} />
          <Stat label="TOTAL LOOK SAVES" value={data?.summary.lookSaves} />
          <Stat label="TOTAL SAVES" value={data?.summary.totalSaves} />
          <Stat label="MOST SAVED ITEM" value={data?.summary.mostSavedItem ?? "—"} text />
        </div>
        <section className="adminCard adminInsightsPanel">
          <div className="adminInsightsToolbar">
            <div className="adminInsightTabs" role="tablist" aria-label="Favorite type">
              {(["all", "product", "look"] as Kind[]).map((value) => <button className={kind === value ? "isActive" : ""} key={value} onClick={() => setKind(value)} type="button">{value === "all" ? "ALL" : `${value.toUpperCase()}S`}</button>)}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); }}>
              <input aria-label="Search favorites by item name" placeholder="Search item name…" value={search} onChange={(event) => setSearch(event.target.value)} />
              <button type="submit">SEARCH</button>
            </form>
            <button className="adminInsightsMore" disabled={loading} onClick={() => void load()} type="button">{loading ? "REFRESHING…" : "REFRESH"}</button>
          </div>
          {error ? <ErrorState message={error} retry={() => void load()} /> : loading && !data ? <p className="adminInsightState">Loading aggregate saves…</p> : !data?.items.filter((item) => !query || item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).length ? <p className="adminInsightState">No loaded items match this view.</p> : (
            <div className="adminInsightRows">
              {data.items.filter((item) => !query || item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((item) => <FavoriteRow item={item} key={item.id} />)}
            </div>
          )}
          {data?.nextCursor ? <button className="adminInsightsMore" disabled={loading} onClick={() => void load(data.nextCursor, true)} type="button">{loading ? "LOADING…" : "LOAD MORE"}</button> : null}
        </section>
    </>
  );
}

function FavoriteRow({ item }: { item: Item }) {
  const href = item.type === "product" ? `/product/${item.slug}` : `/look/${item.slug}`;
  return <Link aria-label={`View ${item.name} on the storefront`} className="adminInsightRow" href={href} prefetch={false}>
    <span className="adminInsightRow__image">{item.imageUrl ? <Image src={item.imageUrl} alt="" width={64} height={72} unoptimized /> : <><span aria-hidden="true">—</span><span className="srOnly">No image available</span></>}</span>
    <span className="adminInsightRow__main"><small>{item.type.toUpperCase()}</small><strong>{item.name}</strong><em>{item.status}</em></span>
    <span className="adminInsightRow__count"><strong>{item.count.toLocaleString()}</strong><small>SAVES</small></span><b aria-hidden="true">↗</b>
  </Link>;
}
function Stat({ label, value, text = false }: { label: string; value: number | string | undefined; text?: boolean }) { return <article className="adminInsightStat"><span>{label}</span><strong className={text ? "isText" : ""}>{value === undefined ? "—" : typeof value === "number" ? value.toLocaleString() : value}</strong></article>; }
function ErrorState({ message, retry }: { message: string; retry: () => void }) { return <div className="adminInsightState adminInsightState--error" role="alert"><span>{message}</span><button onClick={retry} type="button">TRY AGAIN</button></div>; }
async function getToken(forceRefresh = false) { const { auth } = await import("@/lib/firebase/client"); const user = auth.currentUser; if (!user) throw new Error("Admin session expired. Sign in again."); return user.getIdToken(forceRefresh); }
