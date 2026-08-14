import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("app/api/admin/overview/route.ts", "utf8");
const service = readFileSync("lib/admin/overview.ts", "utf8");
const time = readFileSync("lib/time/algiers.ts", "utf8");
const client = readFileSync("components/admin/AdminOverviewClient.tsx", "utf8");
const indexes = JSON.parse(readFileSync("firestore.indexes.json", "utf8"));

test("overview requires canonical Admin authorization", () => {
  assert.match(route, /verifyAdminRequest\(request\)/);
  assert.ok(route.indexOf("verifyAdminRequest(request)") < route.indexOf("getAdminOverview()"));
});

test("order metrics use Algeria half-open day/month boundaries and canonical total", () => {
  assert.match(time, /Africa\/Algiers/);
  for (const boundary of ["dayStart", "nextDayStart", "monthStart", "nextMonthStart"]) assert.match(service, new RegExp(boundary));
  assert.match(service, /status", "==", "pending"\)\.count\(\)/);
  assert.match(service, /createdAtTimestamp", ">=", dayStart/);
  assert.match(service, /createdAtTimestamp", "<", nextDayStart/);
  assert.match(service, /AggregateField\.sum\("totals\.totalDzd"\)/);
});

test("inventory metrics exclude unlimited and archived products", () => {
  assert.match(service, /where\("status", "==", "active"\)\.where\("stockMode", "==", "limited"\)/);
  assert.match(service, /where\("stockQty", ">", 0\)\.where\("stockQty", "<", 5\)\.count\(\)/);
  assert.match(service, /where\("stockQty", "==", 0\)\.count\(\)/);
  assert.ok(indexes.indexes.some((index) => index.collectionGroup === "products" && index.fields.map((field) => field.fieldPath).join(",") === "status,stockMode,stockQty"));
});

test("community, favorites and wishlist use aggregations without user favorite scans", () => {
  assert.match(service, /runClubSubmissions[\s\S]*status", "==", "pending"\)\.count\(\)/);
  assert.match(service, /favoriteAggregates\.aggregate\(\{ value: AggregateField\.sum\("count"\)/);
  assert.match(service, /wishlistSignups"\)\.count\(\)/);
  assert.doesNotMatch(service, /collectionGroup\(["']favorites|users.*favorites/is);
});

test("overview stays bounded, supports partial errors, and links to operational pages", () => {
  assert.match(service, /Promise\.allSettled/);
  assert.doesNotMatch(service, /collection\("(?:orders|products|runClubSubmissions|wishlistSignups)"\)\.get\(\)/);
  assert.match(service, /limit\(1\)/);
  for (const href of ["/admin/orders", "/admin/products", "/admin/run-club"]) assert.match(client, new RegExp(`href: "${href}"`));
  assert.match(client, /Showing the last available values/);
  assert.match(client, /TRY AGAIN/);
});

