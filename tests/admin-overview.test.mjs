import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("app/api/admin/overview/route.ts", "utf8");
const service = readFileSync("lib/admin/overview.ts", "utf8");
const time = readFileSync("lib/time/algiers.ts", "utf8");
const client = readFileSync("components/admin/AdminOverviewClient.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const indexes = JSON.parse(readFileSync("firestore.indexes.json", "utf8"));

test("overview stays private and behind canonical Admin authorization", () => {
  assert.match(route, /verifyAdminRequest\(request\)/);
  assert.ok(route.indexOf("verifyAdminRequest(request)") < route.indexOf("getAdminOverview(range)"));
  assert.match(route, /private, no-store/);
});

test("all four Algeria ranges have matching immediately previous windows", () => {
  assert.match(time, /Africa\/Algiers/);
  assert.match(time, /today: 0, "7d": 6, "30d": 29/);
  assert.match(time, /previousStart: new Date\(start\.getTime\(\) - duration\)/);
  assert.match(time, /previousEnd: start/);
  for (const range of ["today", "7d", "30d", "month"]) assert.match(client, new RegExp(`\\["${range}"`));
});

test("all status KPIs count selected and previous windows through the deployed descending index shape", () => {
  assert.match(service, /const current = rangeQuery\(orders, window\.start, window\.end\), previous = rangeQuery\(orders, window\.previousStart, window\.previousEnd\)/);
  assert.match(service, /statusRangeCount\(current, status\), statusRangeCount\(previous, status\)/);
  for (const [key, status] of [["pendingOrders", "pending"], ["deliveredOrders", "delivered"], ["cancelledOrders", "cancelled"], ["returnedOrders", "returned"]]) {
    assert.match(service, new RegExp(`\\["${key}", statusPair\\("${status}"\\)\\]`));
  }
  assert.match(service, /where\("status", "==", status\)\.orderBy\("createdAtTimestamp", "desc"\)\.count\(\)\.get\(\)/);
  assert.ok(indexes.indexes.some((index) => index.collectionGroup === "orders" && index.queryScope === "COLLECTION" && JSON.stringify(index.fields) === JSON.stringify([
    { fieldPath: "status", order: "ASCENDING" },
    { fieldPath: "createdAtTimestamp", order: "DESCENDING" },
    { fieldPath: "__name__", order: "DESCENDING" },
  ])));
});

test("general Orders count remains status-agnostic", () => {
  assert.match(service, /\["orders", Promise\.all\(\[current\.count\(\)\.get\(\), previous\.count\(\)\.get\(\)\]\)\]/);
});

test("FYS-style delta uses absolute percentage and a neutral zero baseline", () => {
  assert.match(service, /previous === 0.*percentage: null.*direction: "neutral"/);
  assert.match(service, /Math\.round\(Math\.abs\(difference\) \/ previous \* 100\)/);
  assert.match(client, /value\.percentage === null \? "—"/);
  assert.match(client, /VS PREV PERIOD/);
});

test("financial performance is delivered-only, snapshot-only, and excludes shipping", () => {
  assert.match(service, /doc\.get\("status"\) !== "delivered"/);
  for (const field of ["totals.itemsSubtotalDzd", "admin.costOfGoodsDzd", "admin.estimatedProfitDzd"]) assert.match(service, new RegExp(field.replaceAll(".", "\\.")));
  assert.doesNotMatch(service, /shippingDzd|totals\.totalDzd/);
  assert.match(service, /hasCompleteSnapshot/);
  assert.match(service, /missingCostOrders \+= 1; continue/);
  assert.match(client, /excluded from financial totals because historical cost snapshots are incomplete/);
});

test("inventory excludes unlimited, made-to-order, draft and archived products", () => {
  assert.match(service, /where\("status", "==", "active"\)\.where\("stockMode", "==", "limited"\)/);
  assert.match(service, /where\("stockQty", ">", 0\)\.where\("stockQty", "<", 5\)/);
  assert.match(service, /where\("stockQty", "==", 0\)/);
  assert.ok(indexes.indexes.some((index) => index.collectionGroup === "products" && index.fields.map((field) => field.fieldPath).join(",") === "status,stockMode,stockQty"));
});

test("financial and chart reads are projected, range-bounded, and hard-capped", () => {
  assert.match(service, /OVERVIEW_ORDER_READ_LIMIT = 500/);
  assert.match(service, /limit\(OVERVIEW_ORDER_READ_LIMIT \+ 1\)/);
  assert.match(service, /select\("createdAtTimestamp", "status", "totals\.itemsSubtotalDzd", "admin\.costOfGoodsDzd", "admin\.estimatedProfitDzd", "items"\)/);
  assert.doesNotMatch(service, /collection\("orders"\)\.get\(\)/);
  assert.doesNotMatch(service, /products\.get\(|productIds|costPriceDzd/);
});

test("series and tooltip expose orders, merchandise, and estimated gross profit", () => {
  assert.match(service, /series: Array<\{ date: string; label: string; orders: number; merchandiseValueDzd: number; estimatedGrossProfitDzd: number \}>/);
  assert.match(service, /orders: 0, merchandiseValueDzd: 0, estimatedGrossProfitDzd: 0/);
  assert.match(client, /Estimated gross profit<strong>/);
  assert.match(client, /GROSS PROFIT/);
  assert.match(css, /\.adminChartPoint \{[^}]*opacity: 0/);
  assert.match(css, /g\.isActive \.adminChartPoint[^}]*opacity: 1/);
});

test("DZD formatting is full precision everywhere and never compact K notation", () => {
  assert.match(client, /Intl\.NumberFormat\("fr-DZ"\)/);
  assert.doesNotMatch(client, /notation:\s*"compact"|compactValue|\bK DZD/);
  assert.match(client, /formatMoney\(total\)/);
  assert.match(client, /axisValue\(tick/);
});

test("KPI cards use SVG library icons, subtle tints, and no emoji decoration", () => {
  for (const icon of ["ShoppingBag", "DollarSign", "TrendingUp", "Package", "Clock3", "Check", "X", "RotateCcw"]) assert.match(client, new RegExp(icon));
  assert.match(client, /adminMetricIcon/);
  for (const tone of ["green", "warm", "amber", "cancelled", "returned"]) assert.match(css, new RegExp(`adminOverviewMetric--${tone}`));
  assert.doesNotMatch(client, /⚡|💰|📦|🚚|❌|↗|▲|▼/);
});

test("Overview hierarchy keeps primary, adjustment, operational, and secondary cards distinct", () => {
  const primary = client.slice(client.indexOf("const primaryCards"), client.indexOf("const financialAdjustmentCards"));
  const adjustments = client.slice(client.indexOf("const financialAdjustmentCards"), client.indexOf("const operationalCards"));
  const operational = client.slice(client.indexOf("const operationalCards"), client.indexOf("const secondaryCards"));
  const secondary = client.slice(client.indexOf("const secondaryCards"), client.indexOf("const categoryColors"));
  for (const key of ["orders", "merchandiseValueDzd", "estimatedGrossProfitDzd", "costOfGoodsSoldDzd", "pendingOrders", "deliveredOrders", "cancelledOrders", "returnedOrders"]) assert.match(primary, new RegExp(`key: "${key}"`));
  assert.doesNotMatch(primary, /estimatedContributionDzd|returnCostsDzd|lowStock|runClubPending/);
  for (const key of ["returnCostsDzd", "estimatedContributionDzd"]) assert.match(adjustments, new RegExp(`key: "${key}"`));
  assert.match(adjustments, /Not net profit/);
  for (const key of ["lowStock", "runClubPending"]) assert.match(operational, new RegExp(`key: "${key}"`));
  assert.doesNotMatch(operational, /pendingOrders|deliveredOrders|cancelledOrders|returnedOrders/);
  for (const key of ["outOfStock", "totalFavorites", "wishlistSignups"]) assert.match(secondary, new RegExp(`key: "${key}"`));
  assert.doesNotMatch(secondary, /returnCostsDzd|estimatedContributionDzd/);
});

test("Overview section order and responsive primary grid remain exact", () => {
  const labels = ["PERFORMANCE", "DAILY TREND", "CATEGORY MIX", "FINANCIAL ADJUSTMENTS", "OPERATIONAL SIGNALS", "SECONDARY SIGNALS", "NEEDS ATTENTION"];
  let position = -1;
  for (const label of labels) { const next = client.indexOf(label, position + 1); assert.ok(next > position, `${label} must follow the previous section`); position = next; }
  assert.match(css, /adminOverviewGrid--primary \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1100px\) \{ \.adminOverviewGrid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("category donut uses merchandise value percentages and full-value tooltip", () => {
  assert.match(client, /item\.merchandiseValueDzd \/ total \* 100/);
  assert.match(client, /CATEGORY/);
  assert.match(client, /formatMoney\(item\.merchandiseValueDzd\)/);
  assert.match(client, /formatMoney\(total\)/);
});

test("independent partial failures preserve unrelated dashboard sections", () => {
  assert.match(service, /Promise\.allSettled/);
  assert.match(service, /unavailable/);
  assert.match(client, /Available sections remain live/);
  assert.match(client, /other data is unaffected/i);
  assert.match(service, /metric unavailable/);
  assert.match(service, /firestoreErrorCode\(result\.reason\)/);
  assert.doesNotMatch(service, /console\.error[^\n]*(?:token|customer|credential|service-account)/i);
});

test("return costs use bounded authoritative return-event timestamps, not order creation dates", () => {
  const returns = service.slice(service.indexOf("async function loadBoundedReturnCosts"), service.indexOf("async function loadBoundedDeliveredBreakdown"));
  assert.match(returns, /collectionGroup\("returnEvents"\)/);
  assert.match(returns, /where\("occurredAtTimestamp", ">=", start\)/);
  assert.match(returns, /where\("occurredAtTimestamp", "<", end\)/);
  assert.match(returns, /limit\(OVERVIEW_ORDER_READ_LIMIT \+ 1\)/);
  assert.match(returns, /select\("returnCostDzd"\)/);
  assert.doesNotMatch(returns, /createdAtTimestamp|collection\("orders"\)|products/);
  assert.ok(indexes.fieldOverrides.some((entry) => entry.collectionGroup === "returnEvents" && entry.fieldPath === "occurredAtTimestamp" && entry.indexes.some((index) => index.order === "DESCENDING" && index.queryScope === "COLLECTION_GROUP")));
});

test("return costs stay separate and estimated contribution subtracts only those costs", () => {
  assert.match(service, /estimatedGrossProfitDzd - returnFinancials\[0\]\.value/);
  assert.match(client, /Gross profit less return costs · Not net profit./);
  assert.match(client, /excludes other operating expenses/);
  assert.doesNotMatch(service, /shippingDzd|totals\.totalDzd/);
});

test("legacy returns without event snapshots contribute no invented fee", () => {
  assert.doesNotMatch(service, /returnedOrders.*300|status.*returned.*returnCost/);
  assert.match(service, /doc\.get\("returnCostDzd"\)/);
});
