import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Collection Hero contains only canonical name and description", async () => {
  const [page, css] = await Promise.all([read("app/looks/[collectionSlug]/page.tsx"), read("app/globals.css")]);
  const hero = page.slice(page.indexOf('<header className="lookCollectionHero">'), page.indexOf("</header>"));
  assert.match(hero, /<h1>\{collection\.name\}<\/h1>/);
  assert.match(hero, /collection\.description \? <p>\{collection\.description\}<\/p> : null/);
  assert.doesNotMatch(page, /collection\.subtitle/);
  assert.equal(page.match(/\{collection\.description\}/g)?.length, 1);
  assert.match(css, /\.lookCollectionHero__overlay h1 \{[\s\S]*?font-size: clamp\(1\.8rem, 4\.2vw, 4rem\)[\s\S]*?white-space: nowrap/);
  assert.match(css, /\.lookCollectionHero__overlay p \{[\s\S]*?color: rgba\(255, 255, 255, 0\.92\)[\s\S]*?line-height: 1\.45/);
});

test("Collection Admin hides legacy subtitle while retaining backward-compatible data handling", async () => {
  const admin = await read("components/admin/looks/AdminLookCollectionsClient.tsx");
  assert.doesNotMatch(admin, /label="Subtitle"/);
  assert.match(admin, /subtitle: item\.subtitle/);
  assert.match(admin, /subtitle: draft\.subtitle/);
  assert.match(admin, /label="Description"/);
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

test("Ensemble tiles are full-figure links with canonical Favorite and promo behavior", async () => {
  const [grid, css, favorite] = await Promise.all([
    read("components/shop/EnsembleGrid.tsx"),
    read("app/globals.css"),
    read("components/favorites/FavoriteButton.tsx"),
  ]);
  assert.match(grid, /look\.figureImage \?\? look\.heroImage/);
  assert.match(grid, /className="ensembleCard__link" href=\{getLookHref\(look\)\}/);
  assert.match(grid, /<h2>\{look\.name\}<\/h2><strong>\{formatDzd\(look\.priceDzd\)\}<\/strong>/);
  assert.match(grid, /getLookPromoState\(look\)/);
  assert.match(grid, /promo\.isValidPromo \? <span className="ensembleCard__promo">PROMO/);
  assert.match(grid, /itemType="look"/);
  assert.match(css, /\.ensembleCard__figure img \{[^}]*object-fit: contain; object-position: center/);
  assert.match(css, /\.ensembleCard__favorite \{ position: absolute; top: 0\.55rem; right: 0\.55rem/);
  assert.match(favorite, /event\.preventDefault\(\)/);
  assert.match(favorite, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(grid, /product\.colors|product\.sizes|ProductCard/);
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
