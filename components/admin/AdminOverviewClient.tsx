"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { invalidateAdminAccessOnDenied } from "@/lib/admin-client-auth";
import type { ComparedMetric, OverviewMetricKey, OverviewPayload } from "@/lib/admin/overview";
import type { OverviewRangeKey } from "@/lib/time/algiers";

const ranges: Array<[OverviewRangeKey, string]> = [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["month", "This month"]];
const cards: Array<{ key: OverviewMetricKey; label: string; money?: boolean; compare?: boolean }> = [
  { key: "orders", label: "ORDERS", compare: true }, { key: "merchandiseValueDzd", label: "MERCHANDISE VALUE", money: true, compare: true },
  { key: "shippingCollectedDzd", label: "SHIPPING COLLECTED", money: true, compare: true }, { key: "pendingOrders", label: "PENDING ORDERS", compare: true },
  { key: "deliveredOrders", label: "DELIVERED ORDERS", compare: true }, { key: "cancelledOrders", label: "CANCELLED ORDERS", compare: true },
  { key: "lowStock", label: "LOW STOCK" }, { key: "outOfStock", label: "OUT OF STOCK" }, { key: "runClubPending", label: "RUN CLUB PENDING" },
  { key: "wishlistSignups", label: "WISHLIST SIGNUPS" }, { key: "totalFavorites", label: "TOTAL FAVORITES" },
];
const categoryColors = ["#c7f400", "#050505", "#7d891c", "#b6ac9a", "#e3ddcf"];

export function AdminOverviewClient() {
  const [data, setData] = useState<OverviewPayload | null>(null), [range, setRange] = useState<OverviewRangeKey>("7d");
  const [chartMode, setChartMode] = useState<"orders" | "merchandiseValueDzd">("orders"), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const load = useCallback(async (selected: OverviewRangeKey) => {
    setLoading(true); setError("");
    try {
      const { auth } = await import("@/lib/firebase/client"); const token = await auth.currentUser?.getIdToken(); if (!token) throw new Error();
      const response = invalidateAdminAccessOnDenied(await fetch(`/api/admin/overview?range=${selected}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }));
      if (!response.ok) throw new Error(); setData(await response.json() as OverviewPayload);
    } catch { setError("Overview metrics could not be refreshed."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const task = queueMicrotask(() => void load(range)); return () => void task; }, [load, range]);
  const numberValue = (key: OverviewMetricKey) => { const value = data?.metrics[key]; return typeof value === "number" ? value : value?.value ?? 0; };
  const actions = [{ count: numberValue("pendingOrders"), label: "pending orders in this range", href: "/admin/orders" }, { count: numberValue("lowStock"), label: "low-stock products", href: "/admin/products" }, { count: numberValue("runClubPending"), label: "Run Club submissions pending", href: "/admin/run-club" }].filter((item) => item.count > 0);
  return <AdminShell title="Overview" description="Operational commerce signals. Merchandise and shipping are reported separately; no profit is inferred.">
    <div className="adminOverviewTop">
      <div className="adminRangePills" aria-label="Dashboard date range">{ranges.map(([key, label]) => <button className={range === key ? "isActive" : ""} type="button" key={key} onClick={() => setRange(key)}>{label}</button>)}</div>
      <div className="adminOverviewToolbar"><span>{data ? `Updated ${new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "Africa/Algiers" }).format(new Date(data.generatedAt))} Algeria time` : "Bounded Firestore aggregates"}</span><button type="button" disabled={loading} onClick={() => void load(range)}>{loading ? "REFRESHING…" : "REFRESH"}</button></div>
    </div>
    {error ? <div className="adminOverviewError" role="status"><span>{error}{data ? " Showing the last available values." : ""}</span><button type="button" onClick={() => void load(range)}>TRY AGAIN</button></div> : null}
    <section className="adminOverviewGrid" aria-label="Operational metrics">{cards.map((card) => <MetricCard key={card.key} card={card} value={data?.metrics[card.key]} unavailable={data?.unavailable.includes(card.key) ?? false} loading={loading && !data} />)}</section>
    <section className="adminOverviewAnalytics">
      <article className="adminCard adminChartPanel"><div className="adminPanelHeader"><div><p>DAILY TREND</p><h2>{chartMode === "orders" ? "Orders per day" : "Merchandise value per day"}</h2></div><div className="adminChartSwitch"><button className={chartMode === "orders" ? "isActive" : ""} onClick={() => setChartMode("orders")}>ORDERS</button><button className={chartMode === "merchandiseValueDzd" ? "isActive" : ""} onClick={() => setChartMode("merchandiseValueDzd")}>VALUE</button></div></div><LineChart data={data?.series ?? []} mode={chartMode} />{data?.chartTruncated ? <small className="adminDataNote">Chart capped at the first 500 orders in this range.</small> : <small className="adminDataNote">Daily buckets use Africa/Algiers time.</small>}</article>
      <article className="adminCard adminDonutPanel"><div className="adminPanelHeader"><div><p>CATEGORY MIX</p><h2>Merchandise value</h2></div></div><Donut categories={data?.categories ?? []} unavailable={data?.unavailable.includes("categories") ?? false} /></article>
    </section>
    <section className="adminCard adminAttention"><div className="adminCard__heading"><p>NEEDS ATTENTION</p><h2>Operational queue</h2></div>{actions.length ? <div>{actions.map((item) => <Link href={item.href} key={item.href}><span><strong>{item.count}</strong> {item.label}</span><b aria-hidden="true">→</b></Link>)}</div> : <p className="adminAttention__clear">No pending operational queues.</p>}</section>
  </AdminShell>;
}

function MetricCard({ card, value, unavailable, loading }: { card: typeof cards[number]; value: ComparedMetric | number | undefined; unavailable: boolean; loading: boolean }) {
  const current = typeof value === "number" ? value : value?.value;
  return <article className="adminOverviewMetric"><span>{card.label}</span>{loading ? <i className="adminOverviewSkeleton" /> : <strong>{unavailable || current === undefined ? "—" : card.money ? formatMoney(current) : current}</strong>}{unavailable ? <small>Temporarily unavailable</small> : card.compare && typeof value === "object" ? <Compare value={value} /> : <small>Current operational total</small>}</article>;
}
function Compare({ value }: { value: ComparedMetric }) { const label = value.direction === "new" ? "New vs zero" : value.changePercent === null ? "No baseline" : `${value.changePercent >= 0 ? "+" : ""}${value.changePercent.toFixed(1)}%`; return <small className={`adminCompare adminCompare--${value.direction}`}><b>{value.direction === "up" || value.direction === "new" ? "↗" : value.direction === "down" ? "↘" : "→"} {label}</b><span>vs previous period</span></small>; }
function formatMoney(value: number) { return `${new Intl.NumberFormat("fr-DZ").format(value)} DZD`; }

function LineChart({ data, mode }: { data: OverviewPayload["series"]; mode: "orders" | "merchandiseValueDzd" }) {
  const points = useMemo(() => { const max = Math.max(1, ...data.map((item) => item[mode])); return data.map((item, index) => ({ x: data.length < 2 ? 50 : (index / (data.length - 1)) * 100, y: 92 - (item[mode] / max) * 78, ...item })); }, [data, mode]);
  if (!points.length) return <div className="adminChartEmpty">No orders in this range.</div>;
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  return <div className="adminLineChart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${mode === "orders" ? "Orders" : "Merchandise value"} daily line chart`}><path className="adminChartGrid" d="M0 92H100 M0 53H100 M0 14H100"/><path className="adminChartArea" d={`${path} L100,92 L0,92 Z`} /><path className="adminChartLine" d={path}/>{points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="1.6"><title>{point.date}: {mode === "orders" ? point.orders : formatMoney(point.merchandiseValueDzd)}</title></circle>)}</svg><div className="adminChartAxis"><span>{points[0].date}</span><span>{points.at(-1)?.date}</span></div></div>;
}

function Donut({ categories, unavailable }: { categories: OverviewPayload["categories"]; unavailable: boolean }) {
  const total = categories.reduce((sum, item) => sum + item.merchandiseValueDzd, 0);
  const segments = categories.map((item, index) => ({ item, index, start: categories.slice(0, index).reduce((sum, entry) => sum + entry.merchandiseValueDzd / total * 100, 0), percent: item.merchandiseValueDzd / total * 100 }));
  if (unavailable) return <div className="adminChartEmpty">Category summary temporarily unavailable.</div>;
  if (!total) return <div className="adminChartEmpty">No category merchandise value in this range.</div>;
  return <div className="adminDonutContent"><svg className="adminDonut" viewBox="0 0 42 42" role="img" aria-label="Merchandise value by category"><circle cx="21" cy="21" r="15.9" fill="none" stroke="#e3ddcf" strokeWidth="7"/>{segments.map(({ item, index, percent, start }) => <circle key={item.category} cx="21" cy="21" r="15.9" fill="none" stroke={categoryColors[index]} strokeWidth="7" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-start} pathLength="100"/>)}<text x="21" y="20" textAnchor="middle">TOTAL</text><text x="21" y="24" textAnchor="middle">{new Intl.NumberFormat("fr-DZ", { notation: "compact" }).format(total)}</text></svg><div className="adminDonutLegend">{categories.map((item, index) => <div key={item.category}><i style={{ background: categoryColors[index] }}/><span><b>{item.category.replaceAll("_", " ")}</b><small>{(item.merchandiseValueDzd / total * 100).toFixed(1)}% · {formatMoney(item.merchandiseValueDzd)}</small></span></div>)}</div></div>;
}
