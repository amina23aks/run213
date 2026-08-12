"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Subscriber = { id: string; email: string; joinedAt: string | null; status: string | null };
type Payload = { total: number; subscribers: Subscriber[]; nextCursor: string | null };

export function AdminWishlistClient() {
  const [data, setData] = useState<Payload | null>(null); const [search, setSearch] = useState(""); const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [pending, setPending] = useState<Subscriber | null>(null);
  const load = useCallback(async (cursor: string | null = null, append = false) => {
    setLoading(true); setError("");
    try { const token = await getToken(); const params = new URLSearchParams(); if (cursor) params.set("cursor", cursor); const response = await fetch(`/api/admin/wishlist?${params}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error("Subscriber list could not be loaded."); const next = await response.json() as Payload; setData((current) => append && current ? { ...next, subscribers: [...current.subscribers, ...next.subscribers] } : next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Subscriber list could not be loaded."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const task = queueMicrotask(() => void load()); return () => void task; }, [load]);
  async function remove() { if (!pending) return; try { const token = await getToken(); const response = await fetch("/api/admin/wishlist", { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: pending.id }) }); if (!response.ok) throw new Error(); setPending(null); await load(); } catch { setError("Subscriber could not be removed. Try again."); setPending(null); } }
  return <AdminShell title="Wishlist" eyebrow="AUDIENCE" description="Join the Club email subscribers, newest first.">
    <div className="adminInsightStats adminInsightStats--single"><Stat total={data?.total} /></div>
    <section className="adminCard adminInsightsPanel">
      <div className="adminInsightsToolbar"><strong>SUBSCRIBERS</strong><form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim().toLowerCase()); }}><input aria-label="Search subscriber email" placeholder="Search email…" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="submit">SEARCH</button></form></div>
      {error ? <div className="adminInsightState adminInsightState--error"><span>{error}</span><button onClick={() => void load()} type="button">TRY AGAIN</button></div> : loading && !data ? <p className="adminInsightState">Loading subscribers…</p> : !data?.subscribers.filter((item) => !query || item.email.toLowerCase().includes(query)).length ? <p className="adminInsightState">No loaded subscribers match this view.</p> : <div className="adminInsightRows">{data.subscribers.filter((item) => !query || item.email.toLowerCase().includes(query)).map((subscriber) => <article className="adminSubscriberRow" key={subscriber.id}><span><strong>{subscriber.email}</strong><small>{subscriber.joinedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(subscriber.joinedAt)) : "Date unavailable"}{subscriber.status ? ` · ${subscriber.status}` : ""}</small></span><button onClick={() => setPending(subscriber)} type="button">REMOVE</button></article>)}</div>}
      {data?.nextCursor ? <button className="adminInsightsMore" disabled={loading} onClick={() => void load(data.nextCursor, true)} type="button">{loading ? "LOADING…" : "LOAD MORE"}</button> : null}
    </section>
    {pending ? <div className="adminConfirmBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPending(null); }}><section aria-labelledby="remove-subscriber-title" aria-modal="true" className="adminConfirmModal" role="dialog"><small>CONFIRM REMOVAL</small><h2 id="remove-subscriber-title">Remove this subscriber?</h2><p>{pending.email} will stop appearing in the Join the Club list.</p><div><button onClick={() => setPending(null)} type="button">KEEP</button><button className="isDanger" onClick={() => void remove()} type="button">REMOVE</button></div></section></div> : null}
  </AdminShell>;
}
function Stat({ total }: { total?: number }) { return <article className="adminInsightStat"><span>TOTAL SUBSCRIBERS</span><strong>{total === undefined ? "—" : total.toLocaleString()}</strong></article>; }
async function getToken() { const { auth } = await import("@/lib/firebase/client"); const token = await auth.currentUser?.getIdToken(); if (!token) throw new Error("Admin session expired. Sign in again."); return token; }
