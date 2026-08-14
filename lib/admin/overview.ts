import "server-only";
import { AggregateField, FieldPath, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAlgeriaCalendarBoundaries } from "@/lib/time/algiers";

export type OverviewMetricKey = "pendingOrders" | "ordersToday" | "ordersThisMonth" | "monthOrderValueDzd" | "lowStock" | "outOfStock" | "runClubPending" | "totalFavorites" | "wishlistSignups" | "mostSavedItem";
export type OverviewPayload = { metrics: Partial<Record<OverviewMetricKey, number | string | null>>; unavailable: OverviewMetricKey[]; generatedAt: string };

export async function getAdminOverview(now = new Date()): Promise<OverviewPayload> {
  const db = getAdminDb();
  const { dayStart, nextDayStart, monthStart, nextMonthStart } = getAlgeriaCalendarBoundaries(now);
  const orders = db.collection("orders");
  const products = db.collection("products").where("status", "==", "active").where("stockMode", "==", "limited");
  const favoriteAggregates = db.collection("favoriteAggregates");
  const jobs: Array<[OverviewMetricKey, Promise<unknown>, (value: unknown) => number | string | null]> = [
    ["pendingOrders", orders.where("status", "==", "pending").count().get(), countValue],
    ["ordersToday", orders.where("createdAtTimestamp", ">=", dayStart).where("createdAtTimestamp", "<", nextDayStart).count().get(), countValue],
    ["ordersThisMonth", orders.where("createdAtTimestamp", ">=", monthStart).where("createdAtTimestamp", "<", nextMonthStart).count().get(), countValue],
    ["monthOrderValueDzd", orders.where("createdAtTimestamp", ">=", monthStart).where("createdAtTimestamp", "<", nextMonthStart).aggregate({ value: AggregateField.sum("totals.totalDzd") }).get(), sumValue],
    ["lowStock", products.where("stockQty", ">", 0).where("stockQty", "<", 5).count().get(), countValue],
    ["outOfStock", products.where("stockQty", "==", 0).count().get(), countValue],
    ["runClubPending", db.collection("runClubSubmissions").where("status", "==", "pending").count().get(), countValue],
    ["totalFavorites", favoriteAggregates.aggregate({ value: AggregateField.sum("count") }).get(), sumValue],
    ["wishlistSignups", db.collection("wishlistSignups").count().get(), countValue],
    ["mostSavedItem", getMostSavedItem(db), identityValue],
  ];
  const settled = await Promise.allSettled(jobs.map(([, promise]) => promise));
  const metrics: OverviewPayload["metrics"] = {};
  const unavailable: OverviewMetricKey[] = [];
  settled.forEach((result, index) => {
    const [key, , parse] = jobs[index];
    if (result.status === "fulfilled") {
      try { metrics[key] = parse(result.value); return; } catch { /* safe partial response */ }
    }
    unavailable.push(key);
    console.error("[admin-overview] metric unavailable", { metric: key });
  });
  return { metrics, unavailable, generatedAt: now.toISOString() };
}

function countValue(value: unknown) { return Number((value as { data(): { count?: number } }).data().count ?? 0); }
function sumValue(value: unknown) { return Number((value as { data(): { value?: number } }).data().value ?? 0); }
function identityValue(value: unknown) { return typeof value === "string" ? value : null; }
async function getMostSavedItem(db: Firestore) {
  const top = await db.collection("favoriteAggregates").orderBy("count", "desc").orderBy(FieldPath.documentId(), "asc").limit(1).get();
  const aggregate = top.docs[0];
  if (!aggregate) return null;
  const type = aggregate.get("type"), itemId = aggregate.get("itemId");
  if ((type !== "product" && type !== "look") || typeof itemId !== "string" || !itemId || itemId.includes("/")) return null;
  const item = await db.collection(type === "product" ? "products" : "looks").doc(itemId).get();
  const name = item.get("name");
  return typeof name === "string" && name.trim() ? name.trim() : "Unavailable item";
}
