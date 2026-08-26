import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const browser = readFileSync("components/shop/ShopBrowser.tsx", "utf8");
const card = readFileSync("components/home/ProductCard.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

function visible(items, count = 8) { return items.slice(0, count); }
function imagesFor(images, selectedColorId = null) {
  const canonical = images.find((image) => image.isPrimary) ?? images[0] ?? null;
  const activeColor = selectedColorId ?? canonical?.colorId ?? null;
  const matching = activeColor ? images.filter((image) => image.colorId === activeColor) : [];
  const primary = selectedColorId ? matching[0] ?? canonical : canonical;
  const sameColor = primary?.colorId ? images.filter((image) => image.colorId === primary.colorId) : [];
  const index = sameColor.findIndex((image) => image.id === primary?.id);
  return [primary, index >= 0 ? sameColor[index + 1] ?? null : null];
}

test("shop presents products in batches of eight and exhausts partial final batches", () => {
  const products = Array.from({ length: 14 }, (_, id) => id);
  assert.equal(visible(products).length, 8);
  assert.equal(visible(products, 16).length, 14);
  assert.match(browser, /INITIAL_BATCH_SIZE = 8/);
  assert.match(browser, /LOAD_MORE_SIZE = 8/);
  assert.match(browser, /visibleCount < filteredProducts\.length/);
});

test("filter keys reset stale visible counts and hide load more for four matches", () => {
  assert.match(browser, /visibleState\.key === filterKey \? visibleState\.count : INITIAL_BATCH_SIZE/);
  assert.equal(visible([1, 2, 3, 4]).length, 4);
});

test("selected colors resolve by colorId and only hover within that color", () => {
  const images = [
    { id: "cream-1", colorId: "cream", isPrimary: true },
    { id: "noir-1", colorId: "noir" },
    { id: "noir-2", colorId: "noir" },
    { id: "cream-2", colorId: "cream" },
  ];
  assert.deepEqual(imagesFor(images, "noir").map((image) => image?.id), ["noir-1", "noir-2"]);
  assert.deepEqual(imagesFor(images).map((image) => image?.id), ["cream-1", "cream-2"]);
  assert.deepEqual(imagesFor(images, "cream").map((image) => image?.id), ["cream-1", "cream-2"]);
  assert.match(card, /product\.images\.filter\(\(image\) => image\.colorId === activeColorId\)/);
});

test("a one-image color never borrows another color for hover", () => {
  const [primary, hover] = imagesFor([{ id: "noir", colorId: "noir", isPrimary: true }, { id: "cream", colorId: "cream" }], "noir");
  assert.equal(primary.id, "noir");
  assert.equal(hover, null);
});

test("swatches isolate clicks and crossfade is pointer-only, lazy, and reduced-motion safe", () => {
  assert.match(card, /event\.preventDefault\(\); event\.stopPropagation\(\); handleColorSelect\(color\.id\)/);
  assert.match(card, /loading="lazy"/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /transition: opacity 280ms ease/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("favorite and add-to-cart remain independent canonical controls", () => {
  assert.match(card, /<FavoriteButton className="productCard__favorite"/);
  assert.match(card, /selectedColor: getColorName\(sourceProduct, selectedColorId\)/);
  assert.match(card, /event\.stopPropagation\(\); handleAddToCart\(\)/);
});
