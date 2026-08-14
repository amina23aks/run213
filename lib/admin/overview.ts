import "server-only";
import { AggregateField, type Query } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { algiersDayKey, getOverviewDateWindow, type OverviewRangeKey } from "@/lib/time/algiers";

export const OVERVIEW_ORDER_READ_LIMIT = 500;
export type RangeMetricKey = "orders" | "merchandiseValueDzd" | "shippingCollectedDzd" | "pendingOrders" | "deliveredOrders" | "cancelledOrders";
export type SnapshotMetricKey = "lowStock" | "outOfStock" | "runClubPending" | "totalFavorites" | "wishlistSignups";
export type OverviewMetricKey = RangeMetricKey | SnapshotMetricKey;
export type ComparedMetric = { value: number; previous: number; changePercent: number | null; direction: "up" | "down" | "flat" | "new" };
export type OverviewPayload = {
  range: OverviewRangeKey;
  window: { start: string; end: string; previousStart: string; previousEnd: string };
  metrics: Partial<Record<OverviewMetricKey, ComparedMetric | number>>;
  series: Array<{ date: string; orders: number; merchandiseValueDzd: number }>;
  categories: Array<{ category: string; merchandiseValueDzd: number }>;
  unavailable: Array<OverviewMetricKey | "series" | "categories">;
  chartTruncated: boolean;
  generatedAt: string;
};

export function compareMetric(value: number, previous: number): ComparedMetric {
  if (previous === 0) return { value, previous, changePercent: null, direction: value === 0 ? "flat" : "new" };
  const changePercent = ((value - previous) / previous) * 100;
  return { value, previous, changePercent, direction: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat" };
}

export async function getAdminOverview(range: OverviewRangeKey = "7d", now = new Date()): Promise<OverviewPayload> {
  const db = getAdminDb();
  const window = getOverviewDateWindow(range, now);
  const orders = db.collection("orders");
  const products = db.collection("products").where("status", "==", "active").where("stockMode", "==", "limited");
  const current = rangeQuery(orders, window.start, window.end);
  const previous = rangeQuery(orders, window.previousStart, window.previousEnd);
  const aggregate = (query: Query) => query.aggregate({
    orders: AggregateField.count(), merchandiseValueDzd: AggregateField.sum("totals.itemsSubtotalDzd"), shippingCollectedDzd: AggregateField.sum("totals.shippingDzd"),
  }).get();
  const statusCount = (query: Query, status: string) => query.where("status", "==", status).count().get();
  const jobs: Array<[OverviewMetricKey | "rangeTotals" | "previousTotals" | "series" | "categories", Promise<unknown>]> = [
    ["rangeTotals", aggregate(current)], ["previousTotals", aggregate(previous)],
    ["pendingOrders", Promise.all([statusCount(current, "pending"), statusCount(previous, "pending")])],
    ["deliveredOrders", Promise.all([statusCount(current, "delivered"), statusCount(previous, "delivered")])],
    ["cancelledOrders", Promise.all([statusCount(current, "cancelled"), statusCount(previous, "cancelled")])],
    ["lowStock", products.where("stockQty", ">", 0).where("stockQty", "<", 5).count().get()],
    ["outOfStock", products.where("stockQty", "==", 0).count().get()],
    ["runClubPending", db.collection("runClubSubmissions").where("status", "==", "pending").count().get()],
    ["totalFavorites", db.collection("favoriteAggregates").aggregate({ value: AggregateField.sum("count") }).get()],
    ["wishlistSignups", db.collection("wishlistSignups").count().get()],
    ["series", loadBoundedBreakdown(current)],
  ];
  const settled = await Promise.allSettled(jobs.map(([, promise]) => promise));
  const metrics: OverviewPayload["metrics"] = {};
  const unavailable: OverviewPayload["unavailable"] = [];
  let currentTotals: Totals | undefined, previousTotals: Totals | undefined;
  let breakdown: Awaited<ReturnType<typeof loadBoundedBreakdown>> | undefined;
  settled.forEach((result, index) => {
    const key = jobs[index][0];
    if (result.status === "rejected") { unavailable.push(key === "rangeTotals" || key === "previousTotals" ? "orders" : key); return; }
    if (key === "rangeTotals") currentTotals = parseTotals(result.value);
    else if (key === "previousTotals") previousTotals = parseTotals(result.value);
    else if (key === "series") breakdown = result.value as Awaited<ReturnType<typeof loadBoundedBreakdown>>;
    else if (key === "pendingOrders" || key === "deliveredOrders" || key === "cancelledOrders") {
      const pair = result.value as unknown[]; metrics[key] = compareMetric(countValue(pair[0]), countValue(pair[1]));
    } else if (key !== "categories" && key !== "orders" && key !== "merchandiseValueDzd" && key !== "shippingCollectedDzd") metrics[key] = key === "totalFavorites" ? sumValue(result.value) : countValue(result.value);
  });
  const resolvedCurrent = currentTotals as Totals | undefined, resolvedPrevious = previousTotals as Totals | undefined;
  const resolvedBreakdown = breakdown as Awaited<ReturnType<typeof loadBoundedBreakdown>> | undefined;
  if (resolvedCurrent && resolvedPrevious) {
    metrics.orders = compareMetric(resolvedCurrent.orders, resolvedPrevious.orders);
    metrics.merchandiseValueDzd = compareMetric(resolvedCurrent.merchandiseValueDzd, resolvedPrevious.merchandiseValueDzd);
    metrics.shippingCollectedDzd = compareMetric(resolvedCurrent.shippingCollectedDzd, resolvedPrevious.shippingCollectedDzd);
  } else for (const key of ["orders", "merchandiseValueDzd", "shippingCollectedDzd"] as const) if (!unavailable.includes(key)) unavailable.push(key);
  if (!resolvedBreakdown) { unavailable.push("categories"); }
  return {
    range, window: Object.fromEntries(Object.entries(window).map(([key, value]) => [key, value.toISOString()])) as OverviewPayload["window"], metrics,
    series: resolvedBreakdown?.series ?? [], categories: resolvedBreakdown?.categories ?? [], unavailable, chartTruncated: resolvedBreakdown?.truncated ?? false, generatedAt: now.toISOString(),
  };
}

type Totals = { orders: number; merchandiseValueDzd: number; shippingCollectedDzd: number };
function rangeQuery(orders: FirebaseFirestore.CollectionReference, start: Date, end: Date) { return orders.where("createdAtTimestamp", ">=", start).where("createdAtTimestamp", "<", end); }
function countValue(value: unknown) { return Number((value as { data(): { count?: number } }).data().count ?? 0); }
function sumValue(value: unknown) { return Number((value as { data(): { value?: number } }).data().value ?? 0); }
function parseTotals(value: unknown): Totals { const data = (value as { data(): Partial<Totals> }).data(); return { orders: Number(data.orders ?? 0), merchandiseValueDzd: Number(data.merchandiseValueDzd ?? 0), shippingCollectedDzd: Number(data.shippingCollectedDzd ?? 0) }; }

async function loadBoundedBreakdown(query: Query) {
  const snapshot = await query.orderBy("createdAtTimestamp", "asc").limit(OVERVIEW_ORDER_READ_LIMIT + 1).select("createdAtTimestamp", "totals.itemsSubtotalDzd", "items").get();
  const daily = new Map<string, { orders: number; merchandiseValueDzd: number }>();
  const categories = new Map<string, number>();
  for (const doc of snapshot.docs.slice(0, OVERVIEW_ORDER_READ_LIMIT)) {
    const date = doc.get("createdAtTimestamp")?.toDate?.();
    if (!(date instanceof Date)) continue;
    const key = algiersDayKey(date), subtotal = Number(doc.get("totals.itemsSubtotalDzd") ?? 0);
    const bucket = daily.get(key) ?? { orders: 0, merchandiseValueDzd: 0 }; bucket.orders += 1; bucket.merchandiseValueDzd += subtotal; daily.set(key, bucket);
    const items = doc.get("items");
    if (Array.isArray(items)) {
      const weightedItems = items.map((item) => ({ category: typeof item?.category === "string" ? item.category : "other", value: Number(item?.allocatedRevenueDzd ?? item?.lineTotalDzd ?? 0) })).filter((item) => Number.isFinite(item.value) && item.value > 0);
      const itemWeight = weightedItems.reduce((sum, item) => sum + item.value, 0);
      for (const item of weightedItems) categories.set(item.category, (categories.get(item.category) ?? 0) + (itemWeight ? subtotal * item.value / itemWeight : 0));
    }
  }
  return {
    series: [...daily].map(([date, values]) => ({ date, ...values })),
    categories: [...categories].map(([category, merchandiseValueDzd]) => ({ category, merchandiseValueDzd })).sort((a, b) => b.merchandiseValueDzd - a.merchandiseValueDzd).slice(0, 5),
    truncated: snapshot.size > OVERVIEW_ORDER_READ_LIMIT,
  };
}
