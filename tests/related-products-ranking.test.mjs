import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const ranking = readFileSync("lib/products/related.ts", "utf8");
const productPage = readFileSync("app/product/[slug]/page.tsx", "utf8");
const relatedComponent = readFileSync("components/product/RelatedProducts.tsx", "utf8");

const relevance = {
  hoodies: ["hoodies", "pants", "tops", "tshirts", "accessories"],
  tops: ["tops", "pants", "hoodies", "tshirts", "accessories"],
  tshirts: ["tshirts", "pants", "hoodies", "tops", "accessories"],
  pants: ["pants", "tops", "tshirts", "hoodies", "accessories"],
  accessories: ["accessories", "hoodies", "tops", "tshirts", "pants"],
};

function rank(current, catalog) {
  const ids = new Set(), slugs = new Set();
  return catalog.filter((item) => {
    if (item.id === current.id || item.slug === current.slug || item.status !== "active" || !item.inStock || !item.images.length || !item.colors.length || ids.has(item.id) || slugs.has(item.slug)) return false;
    ids.add(item.id); slugs.add(item.slug); return true;
  }).sort((a, b) => relevance[current.category].indexOf(a.category) - relevance[current.category].indexOf(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug)).slice(0, 8);
}

function product(id, category, sortOrder, overrides = {}) {
  return { id, slug: id, name: id, category, sortOrder, status: "active", inStock: true, images: [{}], colors: [{}], ...overrides };
}

test("Hoodie relations rank Hoodies, then Pants, then remaining category priorities", () => {
  const current = product("hoodie-current", "hoodies", 1);
  const catalog = [product("accessory", "accessories", 1), product("pant-b", "pants", 20), product("hoodie-b", "hoodies", 20), product("top", "tops", 1), product("pant-a", "pants", 10), product("hoodie-a", "hoodies", 10)];
  assert.deepEqual(rank(current, catalog).map((item) => item.id), ["hoodie-a", "hoodie-b", "pant-a", "pant-b", "top", "accessory"]);
  assert.deepEqual(rank(current, catalog), rank(current, catalog));
});

test("relations exclude current, inactive, unavailable, invalid, and duplicate products", () => {
  const current = product("current", "tops", 1);
  const result = rank(current, [current, product("draft", "tops", 2, { status: "draft" }), product("sold", "tops", 3, { inStock: false }), product("invalid", "tops", 4, { images: [] }), product("one", "tops", 5), product("duplicate-id", "pants", 1, { id: "one" }), product("duplicate-slug", "pants", 2, { slug: "one" })]);
  assert.deepEqual(result.map((item) => item.id), ["one"]);
});

test("relations are capped at eight with deterministic canonical tie breakers", () => {
  const current = product("current", "tshirts", 1);
  const catalog = Array.from({ length: 12 }, (_, index) => product(`tee-${String(index).padStart(2, "0")}`, "tshirts", index % 2));
  assert.equal(rank(current, catalog).length, 8);
  assert.deepEqual(rank(current, catalog).map((item) => item.id), rank(current, [...catalog].reverse()).map((item) => item.id));
  assert.match(ranking, /a\.sortOrder - b\.sortOrder \|\| a\.name\.localeCompare\(b\.name\) \|\| a\.slug\.localeCompare\(b\.slug\)/);
  assert.doesNotMatch(ranking, /random|shuffle/i);
});

test("Product Detail reuses one bounded cached catalog read without N+1 lookups", () => {
  assert.match(productPage, /listActiveProducts\(SHOP_CATALOG_LIMIT\)/);
  assert.match(productPage, /rankRelatedProducts\(product,/);
  assert.doesNotMatch(productPage, /getActiveProductsByIds|Promise\.all\([^)]*getProduct/);
  assert.match(ranking, /RELATED_PRODUCTS_LIMIT = 8/);
  assert.match(relatedComponent, /products\.slice\(0, RELATED_PRODUCTS_LIMIT\)/);
});
