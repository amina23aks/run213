import "server-only";
import { AggregateField, type Query } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { algiersDayKey, algiersDayKeys, getOverviewDateWindow, type OverviewRangeKey } from "@/lib/time/algiers";

export const OVERVIEW_ORDER_READ_LIMIT = 500;
export type ComparedMetric = { value: number; previous: number; percentage: number | null; direction: "up" | "down" | "neutral" };
export type OverviewMetricKey = "orders" | "merchandiseValueDzd" | "estimatedGrossProfitDzd" | "costOfGoodsSoldDzd" | "pendingOrders" | "deliveredOrders" | "cancelledOrders" | "returnedOrders" | "lowStock" | "outOfStock" | "runClubPending" | "totalFavorites" | "wishlistSignups";
export type OverviewPayload = {
  range: OverviewRangeKey;
  window: { start: string; end: string; previousStart: string; previousEnd: string };
  metrics: Partial<Record<OverviewMetricKey, ComparedMetric | number>>;
  series: Array<{ date: string; label: string; orders: number; merchandiseValueDzd: number; estimatedGrossProfitDzd: number }>;
  categories: Array<{ category: string; merchandiseValueDzd: number }>;
  financialCoverage: { currentMissingCostOrders: number; previousMissingCostOrders: number } | null;
  unavailable: Array<OverviewMetricKey | "series" | "categories" | "financials">;
  chartTruncated: boolean;
  generatedAt: string;
};

export function compareMetric(value: number, previous: number): ComparedMetric {
  if (previous === 0) return { value, previous, percentage: null, direction: "neutral" };
  const difference = value - previous;
  return { value, previous, percentage: Math.round(Math.abs(difference) / previous * 100), direction: difference > 0 ? "up" : difference < 0 ? "down" : "neutral" };
}

export async function getAdminOverview(range: OverviewRangeKey = "7d", now = new Date()): Promise<OverviewPayload> {
  const db = getAdminDb(), window = getOverviewDateWindow(range, now), orders = db.collection("orders");
  const products = db.collection("products").where("status", "==", "active").where("stockMode", "==", "limited");
  const current = rangeQuery(orders, window.start, window.end), previous = rangeQuery(orders, window.previousStart, window.previousEnd);
  // Explicit descending order matches the deployed status/date Orders index.
  // Without it, Firestore infers ascending order from the timestamp inequality.
  const statusPair = (status: string) => Promise.all([statusRangeCount(current, status), statusRangeCount(previous, status)]);
  const jobs = [
    ["orders", Promise.all([current.count().get(), previous.count().get()])],
    ["pendingOrders", statusPair("pending")], ["deliveredOrders", statusPair("delivered")], ["cancelledOrders", statusPair("cancelled")], ["returnedOrders", statusPair("returned")],
    ["lowStock", products.where("stockQty", ">", 0).where("stockQty", "<", 5).count().get()], ["outOfStock", products.where("stockQty", "==", 0).count().get()],
    ["runClubPending", db.collection("runClubSubmissions").where("status", "==", "pending").count().get()],
    ["totalFavorites", db.collection("favoriteAggregates").aggregate({ value: AggregateField.sum("count") }).get()], ["wishlistSignups", db.collection("wishlistSignups").count().get()],
    ["currentBreakdown", loadBoundedDeliveredBreakdown(current, window.start, window.end)],
    ["previousBreakdown", loadBoundedDeliveredBreakdown(previous, window.previousStart, window.previousEnd)],
  ] as const;
  const settled = await Promise.allSettled(jobs.map(([, promise]) => promise));
  const metrics: OverviewPayload["metrics"] = {}, unavailable: OverviewPayload["unavailable"] = [];
  let currentBreakdown: Breakdown | null = null, previousBreakdown: Breakdown | null = null;
  settled.forEach((result, index) => {
    const key = jobs[index][0];
    if (result.status === "rejected") {
      console.error("[admin-overview] metric unavailable", { metric: key, code: firestoreErrorCode(result.reason) });
      if (key === "currentBreakdown") unavailable.push("financials", "series", "categories");
      else unavailable.push(key === "previousBreakdown" ? "financials" : key);
      return;
    }
    if (key === "currentBreakdown") currentBreakdown = result.value as Breakdown;
    else if (key === "previousBreakdown") previousBreakdown = result.value as Breakdown;
    else if (key === "orders" || key === "pendingOrders" || key === "deliveredOrders" || key === "cancelledOrders" || key === "returnedOrders") {
      const pair = result.value as unknown[]; metrics[key] = compareMetric(countValue(pair[0]), countValue(pair[1]));
    } else metrics[key] = key === "totalFavorites" ? sumValue(result.value) : countValue(result.value);
  });
  const currentFinancials = currentBreakdown as Breakdown | null, previousFinancials = previousBreakdown as Breakdown | null;
  if (currentFinancials && previousFinancials) {
    metrics.merchandiseValueDzd = compareMetric(currentFinancials.merchandiseValueDzd, previousFinancials.merchandiseValueDzd);
    metrics.costOfGoodsSoldDzd = compareMetric(currentFinancials.costOfGoodsSoldDzd, previousFinancials.costOfGoodsSoldDzd);
    metrics.estimatedGrossProfitDzd = compareMetric(currentFinancials.estimatedGrossProfitDzd, previousFinancials.estimatedGrossProfitDzd);
  } else for (const key of ["merchandiseValueDzd", "costOfGoodsSoldDzd", "estimatedGrossProfitDzd"] as const) unavailable.push(key);
  return {
    range, window: Object.fromEntries(Object.entries(window).map(([key, value]) => [key, value.toISOString()])) as OverviewPayload["window"], metrics,
    series: currentFinancials?.series ?? [], categories: currentFinancials?.categories ?? [],
    financialCoverage: currentFinancials && previousFinancials ? { currentMissingCostOrders: currentFinancials.missingCostOrders, previousMissingCostOrders: previousFinancials.missingCostOrders } : null,
    unavailable, chartTruncated: Boolean(currentFinancials?.truncated || previousFinancials?.truncated), generatedAt: now.toISOString(),
  };
}

type Breakdown = Awaited<ReturnType<typeof loadBoundedDeliveredBreakdown>>;
function rangeQuery(orders: FirebaseFirestore.CollectionReference, start: Date, end: Date) { return orders.where("createdAtTimestamp", ">=", start).where("createdAtTimestamp", "<", end); }
function statusRangeCount(query: Query, status: string) { return query.where("status", "==", status).orderBy("createdAtTimestamp", "desc").count().get(); }
function countValue(value: unknown) { return Number((value as { data(): { count?: number } }).data().count ?? 0); }
function sumValue(value: unknown) { return Number((value as { data(): { value?: number } }).data().value ?? 0); }
function firestoreErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "unknown";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" || typeof code === "number" ? String(code) : "unknown";
}

async function loadBoundedDeliveredBreakdown(query: Query, start: Date, end: Date) {
  const snapshot = await query.orderBy("createdAtTimestamp", "desc").limit(OVERVIEW_ORDER_READ_LIMIT + 1).select("createdAtTimestamp", "status", "totals.itemsSubtotalDzd", "admin.costOfGoodsDzd", "admin.estimatedProfitDzd", "items").get();
  const daily = new Map<string, { orders: number; merchandiseValueDzd: number; estimatedGrossProfitDzd: number }>(), categories = new Map<string, number>();
  let merchandiseValueDzd = 0, costOfGoodsSoldDzd = 0, estimatedGrossProfitDzd = 0, missingCostOrders = 0;
  for (const doc of snapshot.docs.slice(0, OVERVIEW_ORDER_READ_LIMIT)) {
    const date = doc.get("createdAtTimestamp")?.toDate?.(), subtotal = doc.get("totals.itemsSubtotalDzd"), cost = doc.get("admin.costOfGoodsDzd"), profit = doc.get("admin.estimatedProfitDzd");
    if (!(date instanceof Date) || typeof subtotal !== "number") continue;
    const key = algiersDayKey(date), bucket = daily.get(key) ?? { orders: 0, merchandiseValueDzd: 0, estimatedGrossProfitDzd: 0 };
    bucket.orders += 1; daily.set(key, bucket);
    if (doc.get("status") !== "delivered") continue;
    const hasCompleteSnapshot = typeof cost === "number" && Number.isFinite(cost) && typeof profit === "number" && Number.isFinite(profit);
    if (!hasCompleteSnapshot) { missingCostOrders += 1; continue; }
    merchandiseValueDzd += subtotal; costOfGoodsSoldDzd += cost; estimatedGrossProfitDzd += profit;
    bucket.merchandiseValueDzd += subtotal; bucket.estimatedGrossProfitDzd += profit; daily.set(key, bucket);
    const items = doc.get("items");
    if (Array.isArray(items)) {
      const weighted = items.map((item) => ({ category: typeof item?.category === "string" ? item.category : "other", value: Number(item?.allocatedRevenueDzd ?? item?.lineTotalDzd ?? 0) })).filter((item) => Number.isFinite(item.value) && item.value > 0);
      const totalWeight = weighted.reduce((sum, item) => sum + item.value, 0);
      for (const item of weighted) categories.set(item.category, (categories.get(item.category) ?? 0) + (totalWeight ? subtotal * item.value / totalWeight : 0));
    }
  }
  return {
    merchandiseValueDzd, costOfGoodsSoldDzd, estimatedGrossProfitDzd, missingCostOrders,
    series: algiersDayKeys(start, end).map((date) => ({ date, label: new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Algiers", weekday: "short", day: "numeric" }).format(new Date(`${date}T12:00:00+01:00`)), ...(daily.get(date) ?? { orders: 0, merchandiseValueDzd: 0, estimatedGrossProfitDzd: 0 }) })),
    categories: [...categories].map(([category, value]) => ({ category, merchandiseValueDzd: value })).sort((a, b) => b.merchandiseValueDzd - a.merchandiseValueDzd).slice(0, 5), truncated: snapshot.size > OVERVIEW_ORDER_READ_LIMIT,
  };
}
