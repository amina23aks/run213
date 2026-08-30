import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("footer uses real routes and existing ensembles mode without legacy placeholders", async () => {
  const [footer, links] = await Promise.all([read("components/layout/Footer.tsx"), read("constants/home.ts")]);
  assert.doesNotMatch(footer, /href=["']#home/);
  assert.doesNotMatch(links, /title:\s*["']DROP_001/);
  for (const route of ["/shop", "/about", "/run-club", "/shipping", "/returns", "/faq"]) assert.match(links, new RegExp(route.replace("?", "\\?")));
  assert.match(links, /\/shop\?mode=ensembles/);
});

test("legal and information pages render required content", async () => {
  const pages = await Promise.all(["about", "shipping", "returns", "faq", "privacy", "terms"].map((route) => read(`app/${route}/page.tsx`)));
  for (const source of pages) assert.match(source, /publicPageMetadata/);
  assert.match(pages[3], /FaqAccordion/);
  const faq = await read("components/info/FaqAccordion.tsx");
  assert.match(faq, /How do I place an order\?/);
  assert.match(faq, /What is an Ensemble \/ Look\?/);
});

test("analytics is consent gated, PII-free, and purchase follows API success", async () => {
  const [analytics, provider, checkout] = await Promise.all([read("lib/analytics.ts"), read("components/analytics/AnalyticsProvider.tsx"), read("components/checkout/CheckoutForm.tsx")]);
  assert.match(analytics, /ANALYTICS_CONSENT_KEY/);
  assert.match(analytics, /readAnalyticsConsent\(\) !== "allowed"/);
  assert.match(provider, /consent !== "allowed"/);
  assert.match(provider, /ga-disable-/);
  for (const pii of ["fullName", "email", "phone", "address", "notes", "costPriceDzd", "customerAccessToken"]) assert.doesNotMatch(analytics, new RegExp(pii));
  assert.ok(checkout.indexOf("submitOrderToApi") < checkout.indexOf("trackPurchaseAfterSuccess(order"));
});

test("page views allow only clean public storefront paths", async () => {
  const [analytics, provider] = await Promise.all([read("lib/analytics.ts"), read("components/analytics/AnalyticsProvider.tsx")]);
  for (const path of ["/admin", "/admin/", "/account", "/orders/", "/cart", "/checkout", "/favorites", "/order-success", "/api/"]) {
    assert.doesNotMatch(analytics, new RegExp(`PUBLIC_PAGE_VIEW_PATHS[^;]*["']${path.replaceAll("/", "\\/")}`));
  }
  for (const path of ["/shop", "/product/", "/look/", "/looks/"]) assert.match(analytics, new RegExp(path.replaceAll("/", "\\/")));
  assert.match(provider, /isPublicPageViewPath\(pathname\)/);
  assert.match(provider, /page_location: `\$\{window\.location\.origin\}\$\{pagePath\}`/);
  assert.doesNotMatch(provider, /useSearchParams|searchParams|window\.location\.href/);
  assert.match(analytics, /split\(\/\[\?\#\]\//);
});

test("admin analytics is blocked while checkout and purchase events remain available", async () => {
  const [analytics, checkout] = await Promise.all([read("lib/analytics.ts"), read("components/checkout/CheckoutForm.tsx")]);
  assert.match(analytics, /isAdminAnalyticsPath\(window\.location\.pathname\)/);
  assert.match(analytics, /"begin_checkout"/);
  assert.match(analytics, /"add_shipping_info"/);
  assert.match(analytics, /"purchase"/);
  assert.match(checkout, /trackPurchaseAfterSuccess\(order, items\)/);
});

test("footer email remains a normal mailto anchor", async () => {
  const [footer, links] = await Promise.all([read("components/layout/Footer.tsx"), read("constants/home.ts")]);
  assert.match(links, /mailto:213run\.collab@gmail\.com/);
  assert.match(footer, /href\.startsWith\("mailto:"\)[\s\S]*?<a href=\{link\.href\}/);
});

test("sitemap contains all stable public information routes", async () => {
  const sitemap = await read("app/sitemap.ts");
  for (const route of ["/about", "/shipping", "/returns", "/faq", "/privacy", "/terms"]) assert.match(sitemap, new RegExp(route));
});
