"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock3, DollarSign, ExternalLink, Heart, Mail, Minus, Package, PackageX, RotateCcw, ShoppingBag, TrendingDown, TrendingUp, X, type LucideIcon } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { invalidateAdminAccessOnDenied } from "@/lib/admin-client-auth";
import type { ComparedMetric, OverviewMetricKey, OverviewPayload } from "@/lib/admin/overview";
import type { OverviewRangeKey } from "@/lib/time/algiers";

type CardDefinition = { key: OverviewMetricKey; label: string; href: string; icon: LucideIcon; tone: string; money?: boolean; compare?: boolean; detail?: string };
const ranges: Array<[OverviewRangeKey, string]> = [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["month", "This month"]];
const primaryCards: CardDefinition[] = [
  { key: "orders", label: "ORDERS", href: "/admin/orders", icon: ShoppingBag, tone: "lime", compare: true },
  { key: "merchandiseValueDzd", label: "MERCHANDISE VALUE", href: "/admin/orders", icon: DollarSign, tone: "green", money: true, compare: true, detail: "Delivered orders · complete cost snapshots" },
  { key: "estimatedGrossProfitDzd", label: "ESTIMATED GROSS PROFIT", href: "/admin/orders", icon: TrendingUp, tone: "profit", money: true, compare: true, detail: "Merchandise less snapshotted COGS" },
  { key: "costOfGoodsSoldDzd", label: "COST OF GOODS SOLD", href: "/admin/orders", icon: Package, tone: "warm", money: true, compare: true, detail: "Historical order cost snapshots" },
  { key: "pendingOrders", label: "PENDING ORDERS", href: "/admin/orders", icon: Clock3, tone: "amber", compare: true },
  { key: "deliveredOrders", label: "DELIVERED ORDERS", href: "/admin/orders", icon: Check, tone: "delivered", compare: true },
  { key: "cancelledOrders", label: "CANCELLED ORDERS", href: "/admin/orders", icon: X, tone: "cancelled", compare: true },
  { key: "returnedOrders", label: "RETURNED ORDERS", href: "/admin/orders", icon: RotateCcw, tone: "returned", compare: true },
];
const operationalCards: CardDefinition[] = [
  { key: "lowStock", label: "LOW STOCK", href: "/admin/products", icon: AlertTriangle, tone: "amber" },
  { key: "runClubPending", label: "RUN CLUB PENDING", href: "/admin/run-club", icon: Clock3, tone: "lime" },
];
const secondaryCards: CardDefinition[] = [
  { key: "outOfStock", label: "OUT OF STOCK", href: "/admin/products", icon: PackageX, tone: "cancelled" },
  { key: "totalFavorites", label: "TOTAL FAVORITES", href: "/admin/favorites", icon: Heart, tone: "warm" },
  { key: "wishlistSignups", label: "WISHLIST SIGNUPS", href: "/admin/wishlist", icon: Mail, tone: "lime" },
];
const categoryColors = ["#c7f400", "#050505", "#778600", "#aaa18f", "#ded7c9"];

export function AdminOverviewClient() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [range, setRange] = useState<OverviewRangeKey>("7d");
  const [chartMode, setChartMode] = useState<"orders" | "merchandiseValueDzd" | "estimatedGrossProfitDzd">("orders");
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const load = useCallback(async (selected: OverviewRangeKey) => {
    setLoading(true); setError("");
    try {
      const { auth } = await import("@/lib/firebase/client");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error();
      const response = invalidateAdminAccessOnDenied(await fetch(`/api/admin/overview?range=${selected}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }));
      if (!response.ok) throw new Error();
      setData(await response.json() as OverviewPayload);
    } catch { setError("Some overview data could not be refreshed."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const task = queueMicrotask(() => void load(range)); return () => void task; }, [load, range]);
  const metricNumber = (key: OverviewMetricKey) => { const value = data?.metrics[key]; return typeof value === "number" ? value : value?.value ?? 0; };
  const actions = [
    { count: metricNumber("pendingOrders"), label: "pending orders in this range", href: "/admin/orders" },
    { count: metricNumber("lowStock"), label: "low-stock products", href: "/admin/products" },
    { count: metricNumber("outOfStock"), label: "out-of-stock products", href: "/admin/products" },
    { count: metricNumber("runClubPending"), label: "Run Club submissions pending", href: "/admin/run-club" },
  ].filter((item) => item.count > 0);

  return <AdminShell title="Overview" description="The signals that need action. Merchandise value always excludes delivery fees.">
    <header className="adminOverviewTop">
      <div><p>REPORTING PERIOD</p><div className="adminRangePills" aria-label="Dashboard date range">{ranges.map(([key, label]) => <button className={range === key ? "isActive" : ""} type="button" key={key} onClick={() => setRange(key)}>{label}</button>)}</div></div>
      <div className="adminOverviewToolbar"><span>{data ? `Updated ${new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "Africa/Algiers" }).format(new Date(data.generatedAt))} · Algeria time` : "Bounded Firestore reporting"}</span><button type="button" disabled={loading} onClick={() => void load(range)}>{loading ? "REFRESHING…" : "REFRESH"}</button></div>
    </header>
    {error ? <div className="adminOverviewError" role="status"><span>{error}{data ? " Available sections remain live." : ""}</span><button type="button" onClick={() => void load(range)}>TRY AGAIN</button></div> : null}
    <section><div className="adminSectionLabel"><p>PERFORMANCE</p><span>Order counts created in range · financials delivered only</span></div><div className="adminOverviewGrid adminOverviewGrid--primary">{primaryCards.map((card) => <MetricCard key={card.key} card={card} value={data?.metrics[card.key]} unavailable={data?.unavailable.includes(card.key) ?? false} loading={loading && !data} />)}</div>{data?.financialCoverage?.currentMissingCostOrders ? <p className="adminFinancialCoverage"><AlertTriangle size={14}/> {data.financialCoverage.currentMissingCostOrders} delivered order{data.financialCoverage.currentMissingCostOrders === 1 ? "" : "s"} excluded from financial totals because historical cost snapshots are incomplete.</p> : null}</section>
    <article className="adminCard adminChartPanel">
      <div className="adminPanelHeader"><div><p>DAILY TREND</p><h2>{chartMode === "orders" ? "Orders per day" : chartMode === "merchandiseValueDzd" ? "Merchandise value per day" : "Estimated gross profit per day"}</h2><span>Daily buckets · Africa/Algiers</span></div><div className="adminChartSwitch"><button type="button" className={chartMode === "orders" ? "isActive" : ""} onClick={() => setChartMode("orders")}>ORDERS</button><button type="button" className={chartMode === "merchandiseValueDzd" ? "isActive" : ""} onClick={() => setChartMode("merchandiseValueDzd")}>MERCHANDISE VALUE</button><button type="button" className={chartMode === "estimatedGrossProfitDzd" ? "isActive" : ""} onClick={() => setChartMode("estimatedGrossProfitDzd")}>GROSS PROFIT</button></div></div>
      <LineChart data={data?.series ?? []} mode={chartMode} unavailable={data?.unavailable.includes("series") ?? false} />
      <small className="adminDataNote">{data?.chartTruncated ? "Financial totals, trend, and category detail are capped at 500 orders per period; order and status counts remain exact aggregates." : "Hover a point, or tap it on mobile, for all daily values."}</small>
    </article>
    <section className="adminDonutRow"><article className="adminCard adminDonutPanel"><div className="adminPanelHeader"><div><p>CATEGORY MIX</p><h2>Merchandise value by category</h2><span>Canonical item subtotal allocation</span></div></div><Donut categories={data?.categories ?? []} unavailable={data?.unavailable.includes("categories") ?? false} /></article></section>
    <section><div className="adminSectionLabel"><p>OPERATIONAL SIGNALS</p><span>Current queues</span></div><div className="adminOverviewGrid adminOverviewGrid--operational">{operationalCards.map((card) => <MetricCard key={card.key} card={card} value={data?.metrics[card.key]} unavailable={data?.unavailable.includes(card.key) ?? false} loading={loading && !data} />)}</div></section>
    <section><div className="adminSectionLabel"><p>SECONDARY SIGNALS</p><span>Context, not headline performance</span></div><div className="adminOverviewGrid adminOverviewGrid--secondary">{secondaryCards.map((card) => <MetricCard key={card.key} card={card} value={data?.metrics[card.key]} unavailable={data?.unavailable.includes(card.key) ?? false} loading={loading && !data} />)}</div></section>
    <section className="adminCard adminAttention"><div className="adminCard__heading"><p>NEEDS ATTENTION</p><h2>Operational queue</h2></div>{actions.length ? <div>{actions.map((item) => <Link href={item.href} key={`${item.href}-${item.label}`}><span><strong>{item.count}</strong> {item.label}</span><b aria-hidden="true">→</b></Link>)}</div> : <p className="adminAttention__clear">No pending operational queues.</p>}</section>
  </AdminShell>;
}

function MetricCard({ card, value, unavailable, loading }: { card: CardDefinition; value: ComparedMetric | number | undefined; unavailable: boolean; loading: boolean }) {
  const current = typeof value === "number" ? value : value?.value;
  const Icon = card.icon;
  return <Link className={`adminOverviewMetric adminOverviewMetric--${card.tone}`} href={card.href} aria-label={`View ${card.label.toLowerCase()}`}><div className="adminMetricHead"><span className="adminMetricIcon"><Icon size={18} strokeWidth={1.7}/></span><span>{card.label}</span><ExternalLink size={13} aria-hidden="true"/></div>{loading ? <i className="adminOverviewSkeleton" /> : <strong>{unavailable || current === undefined ? "—" : card.money ? formatMoney(current) : new Intl.NumberFormat("en-US").format(current)}</strong>}{unavailable ? <small className="adminMetricUnavailable">Temporarily unavailable · other data is unaffected</small> : card.compare && typeof value === "object" ? <Compare value={value} /> : <small>{card.detail ?? "Current operational total"}</small>}{card.detail && card.compare ? <small className="adminMetricDetail">{card.detail}</small> : null}</Link>;
}
function Compare({ value }: { value: ComparedMetric }) { const DeltaIcon = value.direction === "up" ? TrendingUp : value.direction === "down" ? TrendingDown : Minus; return <small className={`adminCompare adminCompare--${value.direction}`}><b><DeltaIcon size={13} strokeWidth={2.2}/>{value.percentage === null ? "—" : `${value.percentage}%`}</b><span>VS PREV PERIOD</span></small>; }
function formatMoney(value: number) { return `${new Intl.NumberFormat("fr-DZ").format(Math.round(value))} DZD`; }
function axisValue(value: number, money: boolean) { return `${new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 }).format(Math.round(value))}${money ? " DZD" : ""}`; }

function LineChart({ data, mode, unavailable }: { data: OverviewPayload["series"]; mode: "orders" | "merchandiseValueDzd" | "estimatedGrossProfitDzd"; unavailable: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((item) => item[mode]));
  const ceiling = mode === "orders" ? Math.max(1, Math.ceil(max)) : Math.max(100, Math.ceil(max / 100) * 100);
  const points = useMemo(() => data.map((item, index) => ({ x: data.length < 2 ? 50 : 9 + (index / (data.length - 1)) * 88, y: 84 - (item[mode] / ceiling) * 68, ...item })), [data, mode, ceiling]);
  if (unavailable) return <div className="adminChartEmpty">Trend temporarily unavailable. Headline metrics are unaffected.</div>;
  if (!points.length) return <div className="adminChartEmpty">No daily buckets are available.</div>;
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" "), selected = active === null ? null : points[active];
  const ticks = [ceiling, ceiling / 2, 0];
  return <div className="adminLineChart" onMouseLeave={() => setActive(null)}>
    <div className="adminYAxis" aria-hidden="true">{ticks.map((tick) => <span key={tick}>{axisValue(tick, mode !== "orders")}</span>)}</div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${mode === "orders" ? "Orders" : mode === "merchandiseValueDzd" ? "Merchandise value" : "Estimated gross profit"} by Algeria calendar day`}><path className="adminChartGrid" d="M9 16H97 M9 50H97 M9 84H97"/><path className="adminChartArea" d={`${path} L97,84 L9,84 Z`}/><path className="adminChartLine" d={path}/>{points.map((point, index) => <g className={active === index ? "isActive" : ""} key={point.date} onMouseEnter={() => setActive(index)} onClick={() => setActive(index)} onFocus={() => setActive(index)} tabIndex={0} role="button" aria-label={`${point.label}: ${point.orders} orders, ${formatMoney(point.merchandiseValueDzd)} merchandise, ${formatMoney(point.estimatedGrossProfitDzd)} estimated gross profit`}><circle className="adminChartHit" cx={point.x} cy={point.y} r="5"/><circle className="adminChartPoint" cx={point.x} cy={point.y} r="1.35"/></g>)}</svg>
    <div className="adminXAxis" aria-hidden="true">{points.map((point, index) => <span className={points.length > 10 && index % Math.ceil(points.length / 7) !== 0 && index !== points.length - 1 ? "isHidden" : ""} key={point.date} style={{ left: `${point.x}%` }}>{point.label}</span>)}</div>
    {selected ? <div className="adminChartTooltip" style={{ left: `${Math.min(82, Math.max(18, selected.x))}%`, top: `${Math.max(4, selected.y - 5)}%` }} role="status"><small>DATE</small><b>{new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Algiers", weekday: "long", day: "numeric", month: "short" }).format(new Date(`${selected.date}T12:00:00+01:00`))}</b><span><i/>Orders<strong>{selected.orders}</strong></span><span><i/>Merchandise value<strong>{formatMoney(selected.merchandiseValueDzd)}</strong></span><span><i/>Estimated gross profit<strong>{formatMoney(selected.estimatedGrossProfitDzd)}</strong></span></div> : null}
  </div>;
}

function Donut({ categories, unavailable }: { categories: OverviewPayload["categories"]; unavailable: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const total = categories.reduce((sum, item) => sum + item.merchandiseValueDzd, 0);
  const segments = categories.map((item, index) => ({ item, index, start: categories.slice(0, index).reduce((sum, entry) => sum + entry.merchandiseValueDzd / total * 100, 0), percent: item.merchandiseValueDzd / total * 100 }));
  if (unavailable) return <div className="adminChartEmpty">Category detail temporarily unavailable. Other sections remain live.</div>;
  if (!total) return <div className="adminChartEmpty">No category merchandise value in this range.</div>;
  const selected = active === null ? null : segments[active];
  return <div className="adminDonutContent" onMouseLeave={() => setActive(null)}><div className="adminDonutVisual"><svg className="adminDonut" viewBox="0 0 42 42" role="img" aria-label="Merchandise value by category"><circle cx="21" cy="21" r="15.9" fill="none" stroke="#e3ddcf" strokeWidth="7"/>{segments.map(({ item, index, percent, start }) => <circle className={active === index ? "isActive" : ""} key={item.category} cx="21" cy="21" r="15.9" fill="none" stroke={categoryColors[index]} strokeWidth="7" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-start} pathLength="100" tabIndex={0} role="button" aria-label={`${item.category}, ${formatMoney(item.merchandiseValueDzd)}, ${percent.toFixed(1)} percent`} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)}/>)}</svg><div className="adminDonutCenter"><span>{selected ? selected.item.category.replaceAll("_", " ") : "TOTAL"}</span><strong>{selected ? `${selected.percent.toFixed(1)}%` : formatMoney(total)}</strong></div>{selected ? <div className="adminDonutTooltip" role="status"><small>CATEGORY</small><b>{selected.item.category.replaceAll("_", " ")}</b><span>{formatMoney(selected.item.merchandiseValueDzd)}</span><small>{selected.percent.toFixed(1)}% of merchandise value</small></div> : null}</div><div className="adminDonutLegend">{segments.map(({ item, index, percent }) => <button type="button" key={item.category} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)}><i style={{ background: categoryColors[index] }}/><span><b>{item.category.replaceAll("_", " ")}</b><small>{percent.toFixed(1)}% · {formatMoney(item.merchandiseValueDzd)}</small></span></button>)}</div></div>;
}
