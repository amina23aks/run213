"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { invalidateAdminAccessOnDenied } from "@/lib/admin-client-auth";
import type { OverviewMetricKey, OverviewPayload } from "@/lib/admin/overview";

const cards: Array<{ key: OverviewMetricKey; label: string; money?: boolean }> = [
  { key: "pendingOrders", label: "PENDING ORDERS" }, { key: "ordersToday", label: "ORDERS TODAY" },
  { key: "ordersThisMonth", label: "ORDERS THIS MONTH" }, { key: "monthOrderValueDzd", label: "MONTH ORDER VALUE", money: true },
  { key: "lowStock", label: "LOW STOCK" }, { key: "outOfStock", label: "OUT OF STOCK" },
  { key: "runClubPending", label: "RUN CLUB PENDING" }, { key: "totalFavorites", label: "TOTAL FAVORITES" },
  { key: "wishlistSignups", label: "WISHLIST SIGNUPS" }, { key: "mostSavedItem", label: "MOST SAVED ITEM" },
];

export function AdminOverviewClient() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { auth } = await import("@/lib/firebase/client");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error();
      const response = invalidateAdminAccessOnDenied(await fetch("/api/admin/overview", { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }));
      if (!response.ok) throw new Error();
      setData(await response.json() as OverviewPayload);
    } catch { setError("Overview metrics could not be refreshed."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const task = queueMicrotask(() => void load()); return () => void task; }, [load]);
  const count = (key: OverviewMetricKey) => typeof data?.metrics[key] === "number" ? data.metrics[key] as number : 0;
  const actions = [
    { count: count("pendingOrders"), label: "pending orders", href: "/admin/orders" },
    { count: count("lowStock"), label: "low-stock products", href: "/admin/products" },
    { count: count("runClubPending"), label: "Run Club submissions pending", href: "/admin/run-club" },
  ].filter((item) => item.count > 0);
  return <AdminShell title="Overview" description="Live operational signals. Order value includes all COD orders created this month; it is not collected revenue.">
    <div className="adminOverviewToolbar"><span>{data ? `Updated ${new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "Africa/Algiers" }).format(new Date(data.generatedAt))} Algeria time` : "Bounded Firestore aggregates"}</span><button type="button" disabled={loading} onClick={() => void load()}>{loading ? "REFRESHING…" : "REFRESH"}</button></div>
    {error ? <div className="adminOverviewError" role="status"><span>{error}{data ? " Showing the last available values." : ""}</span><button type="button" onClick={() => void load()}>TRY AGAIN</button></div> : null}
    <section className="adminOverviewGrid" aria-label="Operational metrics">
      {cards.map((card) => { const value = data?.metrics[card.key]; const unavailable = data?.unavailable.includes(card.key); return <article className="adminOverviewMetric" key={card.key}><span>{card.label}</span>{loading && !data ? <i className="adminOverviewSkeleton" /> : <strong>{unavailable || value === undefined ? "—" : card.money && typeof value === "number" ? `${new Intl.NumberFormat("fr-DZ").format(value)} DZD` : value ?? "None yet"}</strong>}{unavailable ? <small>Temporarily unavailable</small> : card.key === "monthOrderValueDzd" ? <small>Created COD order value</small> : null}</article>; })}
    </section>
    <section className="adminCard adminAttention"><div className="adminCard__heading"><p>NEEDS ATTENTION</p><h2>Operational queue</h2></div>{actions.length ? <div>{actions.map((item) => <Link href={item.href} key={item.href}><span><strong>{item.count}</strong> {item.label}</span><b aria-hidden="true">→</b></Link>)}</div> : <p className="adminAttention__clear">No pending operational queues.</p>}</section>
  </AdminShell>;
}

