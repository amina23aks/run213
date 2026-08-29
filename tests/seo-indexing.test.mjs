import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const seo = read("lib/seo.ts");
const layout = read("app/layout.tsx");
const home = read("app/page.tsx");
const shop = read("app/shop/page.tsx");
const product = read("app/product/[slug]/page.tsx");
const look = read("app/look/[lookSlug]/page.tsx");
const collection = read("app/looks/[collectionSlug]/page.tsx");
const sitemap = read("app/sitemap.ts");
const robots = read("app/robots.ts");

test("canonical SEO configuration is fixed to production and previews are noindex", () => {
  assert.match(seo, /SITE_ORIGIN = "https:\/\/run213\.vercel\.app"/);
  assert.match(layout, /metadataBase: SITE_URL/);
  assert.match(layout, /isProductionDeployment \? \{ index: true, follow: true \} : \{ index: false, follow: false \}/);
  assert.doesNotMatch(`${seo}${layout}`, /VERCEL_URL|headers\(\)|request\.headers/);
});

test("Home and Shop publish stable production canonicals and social metadata", () => {
  assert.match(home, /pathname: "\/"/);
  assert.match(home, /title: \{ absolute: SITE_TITLE \}/);
  assert.match(shop, /pathname: "\/shop"/);
  assert.match(shop, /Boolean\(params\.search\)/);
  assert.match(shop, /robots: \{ index: false, follow: true \}/);
  assert.match(seo, /card: "summary_large_image"/);
});

test("dynamic public metadata uses cached active storefront lookups", () => {
  assert.match(product, /cache\(getProductBySlug\)/);
  assert.match(product, /pathname: `\/product\/\$\{product\.slug\}`/);
  assert.match(look, /cache\(getActiveLookBySlug\)/);
  assert.match(look, /pathname: `\/look\/\$\{look\.slug\}`/);
  assert.match(collection, /cache\(getActiveLookCollectionBySlug\)/);
  assert.match(collection, /pathname: `\/looks\/\$\{collection\.slug\}`/);
});

test("Product JSON-LD has canonical DZD offers without private commerce fields", () => {
  assert.match(product, /"@type": "Product"/);
  assert.match(product, /priceCurrency: "DZD"/);
  assert.match(product, /product\.inStock \? "InStock" : "OutOfStock"/);
  assert.match(product, /safeJsonLd\(jsonLd\)/);
  assert.doesNotMatch(product, /costPriceDzd|reviewCount|aggregateRating|priceValidUntil/);
});

test("private route layouts consistently export noindex metadata", () => {
  for (const path of ["app/admin/layout.tsx", "app/account/layout.tsx", "app/orders/layout.tsx", "app/checkout/layout.tsx", "app/cart/layout.tsx", "app/favorites/layout.tsx", "app/order-success/layout.tsx"]) {
    assert.match(read(path), /privatePageMetadata/);
  }
  assert.match(seo, /robots: \{ index: false, follow: false \}/);
});

test("bounded sitemap includes active catalog types and only canonical route shapes", () => {
  assert.match(sitemap, /Promise\.all\(\[/);
  assert.match(sitemap, /listActiveProducts\(SHOP_CATALOG_LIMIT\)/);
  assert.match(sitemap, /listActiveLooks\(SEO_LOOK_LIMIT\)/);
  assert.match(sitemap, /listActiveLookCollections\(SEO_COLLECTION_LIMIT\)/);
  for (const route of ["/", "/shop", "/run-club", "/product/", "/look/", "/looks/"]) assert.ok(sitemap.includes(route));
  assert.doesNotMatch(sitemap, /canonicalUrl\(`?"?\/(?:admin|orders|checkout|favorites|api)/);
  assert.doesNotMatch(sitemap, /new Date\(\)/);
});

test("robots points at production sitemap and blocks previews and APIs safely", () => {
  assert.match(robots, /SITE_ORIGIN.*sitemap\.xml/);
  assert.match(robots, /if \(!isProductionDeployment\)/);
  assert.match(robots, /disallow: "\/"/);
  assert.match(robots, /allow: "\/", disallow: \["\/api\/"\]/);
});
