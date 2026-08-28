import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Collection Hero contains only a compact single-line name", async () => {
  const [page, css] = await Promise.all([read("app/looks/[collectionSlug]/page.tsx"), read("app/globals.css")]);
  const hero = page.slice(page.indexOf('<header className="lookCollectionHero">'), page.indexOf("</header>"));
  assert.match(hero, /<h1>\{collection\.name\}<\/h1>/);
  assert.doesNotMatch(hero, /collection\.subtitle|collection\.description/);
  assert.match(css, /\.lookCollectionHero__overlay h1 \{[\s\S]*?font-size: clamp\(1\.8rem, 4\.2vw, 4rem\)[\s\S]*?white-space: nowrap/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.lookCollectionHero__overlay h1 \{[\s\S]*?font-size: clamp\(1\.55rem, 8vw, 2\.5rem\)/);
});

test("Collection subtitle leads below the Hero and description stays distinct and optional", async () => {
  const page = await read("app/looks/[collectionSlug]/page.tsx");
  assert.equal(page.match(/\{collection\.subtitle\}/g)?.length, 1);
  assert.ok(page.indexOf("collection.subtitle") > page.indexOf("</header>"));
  assert.match(page, /lookCollectionIntro__subtitle/);
  assert.match(page, /collection\.description \? <p className="lookCollectionIntro__description">\{collection\.description\}<\/p> : null/);
  assert.doesNotMatch(page, /\{collection\.description \|\| collection\.subtitle\}|\{collection\.subtitle \|\| collection\.description\}/);
});

test("five homepage Looks remain five canonical semantic entries without hard-coding", async () => {
  const client = await read("components/home/ShopTheLookClient.tsx");
  const fiveIds = ["a", "b", "c", "d", "e"];
  assert.equal(new Map(fiveIds.map((id) => [id, id])).size, 5);
  assert.match(client, /logicalFigures\.map\(\(figure, originalIndex\)/);
  assert.match(client, /String\(originalIndex \+ 1\)\.padStart\(2, "0"\)/);
  assert.match(client, /key=\{figure\.id\}/);
  assert.doesNotMatch(client, /slice\(0,\s*4\)|repeat\(5|\[\.\.\.figures, \.\.\.figures\]/);
});

test("ENSEMBLES is a separate Shop mode backed by active Looks", async () => {
  const [page, browser, grid, looks] = await Promise.all([
    read("app/shop/page.tsx"),
    read("components/shop/ShopBrowser.tsx"),
    read("components/shop/EnsembleGrid.tsx"),
    read("lib/firestore/looks.ts"),
  ]);
  assert.match(page, /listActiveLooks\(\)/);
  assert.match(browser, /mode === "ensembles" \? <EnsembleGrid looks=\{filteredLooks\} \/> : <ShopGrid products=\{visibleProducts\} \/>/);
  assert.match(browser, />ENSEMBLES<\/button>/);
  assert.match(looks, /collection\(LOOKS\)\.where\("status", "==", "active"\)/);
  assert.match(grid, /look\.figureImage \?\? look\.heroImage/);
  assert.match(grid, /formatDzd\(look\.priceDzd\)/);
  assert.match(grid, /itemType="look"/);
  assert.doesNotMatch(grid, /product\.colors|product\.sizes|getActiveProductsByIds/);
});

test("Product categories remain unchanged and never gain ensemble", async () => {
  const [types, filters] = await Promise.all([read("types/product.ts"), read("constants/shop.ts")]);
  assert.match(types, /"tshirts" \| "tops" \| "pants" \| "hoodies" \| "accessories"/);
  assert.doesNotMatch(types, /ensemble/i);
  assert.match(filters, /type ShopMode = "products" \| "ensembles"/);
});

test("Shop Look reads are bounded, active-only, and do not resolve Products", async () => {
  const source = await read("lib/firestore/looks.ts");
  const start = source.indexOf("export async function listActiveLooks(");
  const end = source.indexOf("export async function getActiveLookCollectionBySlug", start);
  const implementation = source.slice(start, end);
  assert.match(implementation, /where\("status", "==", "active"\)\.limit\(READ_LIMIT\)/);
  assert.match(implementation, /slice\(0, limit\)/);
  assert.doesNotMatch(implementation, /resolveLookProducts|getActiveProductsByIds/);
});

test("Look Detail retains canonical Product variants, static Hero, and canonical Look price", async () => {
  const detail = await read("components/look/LookDetailClient.tsx");
  assert.match(detail, /image\.colorId === selectedColorId/);
  assert.match(detail, /selectedColorId: state\.colorId/);
  assert.match(detail, /selectedSize: state\.size/);
  assert.match(detail, /src=\{cloudinaryImageUrl\(look\.heroImage\.url/);
  assert.match(detail, /priceDzd: look\.priceDzd/);
});
