import test from "node:test";
import assert from "node:assert/strict";
import { cleanPageLocation, cleanPathname, isAdminPath, isPublicPageViewPath } from "../lib/analytics-routing.js";
import { readFile } from "node:fs/promises";

const blockedPaths = [
  "/admin",
  "/admin/orders",
  "/account",
  "/account/profile",
  "/orders/private-order-id",
  "/favorites",
  "/checkout",
  "/cart",
  "/order-success/private-order-id",
  "/api/orders",
  "/contact",
  "/wishlist",
  "/product",
  "/look",
  "/looks",
  "/shop/sale",
];

const publicPaths = ["/", "/shop", "/product/oversized-tee", "/look/summer-road", "/looks/summer-road", "/run-club", "/about", "/shipping", "/returns", "/faq", "/privacy", "/terms"];

test("private, account, admin, and transactional page views are blocked", () => {
  for (const pathname of blockedPaths) assert.equal(isPublicPageViewPath(pathname), false, pathname);
});

test("public storefront page views remain allowed", () => {
  for (const pathname of publicPaths) {
    assert.equal(isPublicPageViewPath(pathname), true, pathname);
    assert.equal(isPublicPageViewPath(`${pathname}?email=private@example.com#private`), true, pathname);
  }
});

test("page locations contain only the origin and pathname", () => {
  assert.equal(cleanPathname("/shop?search=amina&category=hoodies#results"), "/shop");
  assert.equal(cleanPageLocation("https://213run.com", "/shop?search=amina#results"), "https://213run.com/shop");
  assert.equal(isPublicPageViewPath("/orders/customer@example.com?token=secret"), false);
});

test("admin analytics are blocked while checkout and purchase event support remains", async () => {
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/admin/orders"), true);
  const [analytics, provider] = await Promise.all([
    readFile(new URL("../lib/analytics.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/analytics/AnalyticsProvider.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(analytics, /isAdminPath\(window\.location\.pathname\)/);
  assert.match(analytics, /"begin_checkout"/);
  assert.match(analytics, /"add_shipping_info"/);
  assert.match(analytics, /"purchase"/);
  assert.match(analytics, /transaction_id: order\.orderId/);
  assert.match(analytics, /value: order\.totals\.totalDzd/);
  assert.match(analytics, /window\.sessionStorage\.getItem\(key\)/);
  assert.match(analytics, /window\.sessionStorage\.setItem\(key, "1"\)/);
  assert.match(provider, /page_path: pagePath/);
  assert.doesNotMatch(provider, /useSearchParams|window\.location\.href/);
});

test("footer keeps the support email as an accessible mailto link", async () => {
  const [footer, links] = await Promise.all([
    readFile(new URL("../components/layout/Footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../constants/home.ts", import.meta.url), "utf8"),
  ]);
  assert.match(links, /href:\s*"mailto:213run\.collab@gmail\.com"/);
  assert.match(footer, /<a href=\{link\.href\}/);
});
