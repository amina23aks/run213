import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const browser = readFileSync("components/shop/ShopBrowser.tsx", "utf8");
const card = readFileSync("components/home/ProductCard.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

function visible(items, count = 8) { return items.slice(0, count); }
function imagesFor(images, selectedColorId = null) {
  const valid = images.filter((image) => image.url !== "");
  const canonical = valid.find((image) => image.isPrimary) ?? valid[0] ?? null;
  const matching = selectedColorId ? valid.filter((image) => image.colorId === selectedColorId) : [];
  const primary = selectedColorId ? matching[0] ?? canonical : canonical;
  const distinct = valid.filter((image) => image.id !== primary?.id && image.url !== primary?.url);
  return [primary, distinct.find((image) => image.colorId === primary?.colorId) ?? distinct[0] ?? null];
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

test("selected colors resolve by colorId and prefer a second same-color image", () => {
  const images = [
    { id: "cream-1", url: "cream-1.jpg", colorId: "cream", isPrimary: true },
    { id: "noir-1", url: "noir-1.jpg", colorId: "noir" },
    { id: "noir-2", url: "noir-2.jpg", colorId: "noir" },
    { id: "cream-2", url: "cream-2.jpg", colorId: "cream" },
  ];
  assert.deepEqual(imagesFor(images, "noir").map((image) => image?.id), ["noir-1", "noir-2"]);
  assert.deepEqual(imagesFor(images).map((image) => image?.id), ["cream-1", "cream-2"]);
  assert.deepEqual(imagesFor(images, "cream").map((image) => image?.id), ["cream-1", "cream-2"]);
  assert.match(card, /images\.filter\(\(image\) => image\.colorId === selectedColorId\)/);
});

test("a one-image selected color uses another distinct product image as preview only", () => {
  const [primary, hover] = imagesFor([{ id: "noir", url: "noir.jpg", colorId: "noir", isPrimary: true }, { id: "cream", url: "cream.jpg", colorId: "cream" }], "noir");
  assert.equal(primary.id, "noir");
  assert.equal(hover.id, "cream");
  assert.match(card, /selectedColor: getColorName\(sourceProduct, selectedColorId\)/);
});

test("a product with one total valid image has no hover alternate", () => {
  const [primary, hover] = imagesFor([{ id: "only", url: "only.jpg", colorId: "noir", isPrimary: true }], "noir");
  assert.equal(primary.id, "only");
  assert.equal(hover, null);
});

test("base stays visible until successful image load and failed previews remain transparent", () => {
  assert.match(card, /if \(event\.currentTarget\.naturalWidth > 0\) setLoadedHoverSrc\(hoverSrc\)/);
  assert.match(card, /if \(loadedHoverSrc === hoverSrc\) setLoadedHoverSrc\(null\)/);
  assert.doesNotMatch(css, /hover \.productCard__primaryImage \{ opacity: 0/);
  assert.match(css, /hoverImage\.is-loaded \{ opacity: 1/);
});

test("all card image layers share one fixed ecommerce crop regardless of source dimensions", () => {
  assert.match(css, /productCard__primaryImage,[\s\S]*?productCard__selectedImage,[\s\S]*?productCard__hoverImage \{[^}]*position: absolute;[^}]*inset: 0;[^}]*height: 100%;[^}]*width: 100%;[^}]*object-fit: cover;[^}]*object-position: center/);
  assert.match(css, /\.productCard \.productCard__media,[\s\S]*?\.productCard \.productImageWrap \{[^}]*aspect-ratio: 1 \/ 0\.82;[^}]*min-height: 0;[^}]*max-height: none;[^}]*overflow: hidden/);
});

test("swatches isolate clicks and selected images crossfade without hover dependency", () => {
  assert.match(card, /event\.preventDefault\(\); event\.stopPropagation\(\); handleColorSelect\(color\.id\)/);
  assert.match(card, /loading="lazy"/);
  assert.match(card, /productCard__selectedImage is-loaded/);
  assert.match(css, /selectedImage\.is-loaded \{ opacity: 1; transition: opacity 240ms ease/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /transition: opacity 280ms ease/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("favorite and add-to-cart remain independent canonical controls", () => {
  assert.match(card, /<FavoriteButton className="productCard__favorite"/);
  assert.match(card, /selectedColor: getColorName\(sourceProduct, selectedColorId\)/);
  assert.match(card, /event\.stopPropagation\(\); handleAddToCart\(\)/);
});
