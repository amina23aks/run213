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

test("sitemap contains all stable public information routes", async () => {
  const sitemap = await read("app/sitemap.ts");
  for (const route of ["/about", "/shipping", "/returns", "/faq", "/privacy", "/terms"]) assert.match(sitemap, new RegExp(route));
});
