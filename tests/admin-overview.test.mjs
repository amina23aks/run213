import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("app/api/admin/overview/route.ts", "utf8");
const service = readFileSync("lib/admin/overview.ts", "utf8");
const time = readFileSync("lib/time/algiers.ts", "utf8");
const client = readFileSync("components/admin/AdminOverviewClient.tsx", "utf8");
const indexes = JSON.parse(readFileSync("firestore.indexes.json", "utf8"));

test("overview remains private and requires canonical Admin authorization", () => {
  assert.match(route, /verifyAdminRequest\(request\)/);
  assert.ok(route.indexOf("verifyAdminRequest(request)") < route.indexOf("getAdminOverview(range)"));
  assert.match(route, /private, no-store/);
});

test("date ranges are Algeria calendar windows with matching previous windows", () => {
  assert.match(time, /Africa\/Algiers/);
  assert.match(time, /today: 0, "7d": 6, "30d": 29/);
  assert.match(time, /previousStart: new Date\(start\.getTime\(\) - duration\)/);
  assert.match(time, /previousEnd: start/);
  for (const range of ["today", "7d", "30d", "month"]) assert.match(client, new RegExp(`\\["${range}"`));
});

test("merchandise and shipping use separate canonical aggregates and never infer profit", () => {
  assert.match(service, /AggregateField\.sum\("totals\.itemsSubtotalDzd"\)/);
  assert.match(service, /AggregateField\.sum\("totals\.shippingDzd"\)/);
  assert.doesNotMatch(service, /totals\.totalDzd|profit/i);
  assert.match(client, /Merchandise and shipping are reported separately; no profit is inferred/);
});

test("range KPIs compare current and immediately previous aggregates", () => {
  assert.match(service, /compareMetric\(resolvedCurrent\.orders, resolvedPrevious\.orders\)/);
  assert.match(service, /previous === 0/);
  for (const status of ["pending", "delivered", "cancelled"]) assert.match(service, new RegExp(`statusCount\\(current, "${status}"\\)`));
});

test("inventory excludes unlimited, made-to-order, draft and archived products", () => {
  assert.match(service, /where\("status", "==", "active"\)\.where\("stockMode", "==", "limited"\)/);
  assert.match(service, /where\("stockQty", ">", 0\)\.where\("stockQty", "<", 5\)/);
  assert.match(service, /where\("stockQty", "==", 0\)/);
  assert.ok(indexes.indexes.some((index) => index.collectionGroup === "products" && index.fields.map((field) => field.fieldPath).join(",") === "status,stockMode,stockQty"));
});

test("time series and categories use one bounded selected-range order query", () => {
  assert.match(service, /OVERVIEW_ORDER_READ_LIMIT = 500/);
  assert.match(service, /limit\(OVERVIEW_ORDER_READ_LIMIT \+ 1\)/);
  assert.match(service, /select\("createdAtTimestamp", "totals\.itemsSubtotalDzd", "items"\)/);
  assert.doesNotMatch(service, /collection\("orders"\)\.get\(\)/);
  assert.match(client, /Orders per day/);
  assert.match(client, /CATEGORY MIX/);
});

test("overview supports independent partial failures", () => {
  assert.match(service, /Promise\.allSettled/);
  assert.match(service, /unavailable/);
  assert.match(client, /Showing the last available values/);
  assert.match(client, /temporarily unavailable/i);
});
