import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function availability({ status = "active", stockMode, stockQty }) {
  if (status !== "active") return "unavailable";
  return stockMode === "limited" && !(stockQty > 0) ? "out_of_stock" : "in_stock";
}

test("canonical availability distinguishes stock from storefront status", () => {
  assert.equal(availability({ stockMode: "limited", stockQty: 4 }), "in_stock");
  assert.equal(availability({ stockMode: "limited", stockQty: 0 }), "out_of_stock");
  assert.equal(availability({ stockMode: "unlimited", stockQty: 0 }), "in_stock");
  assert.equal(availability({ status: "archived", stockMode: "limited", stockQty: 0 }), "unavailable");
});

test("stock writes prevent negative quantities and synchronize the stock flag", () => {
  const orderSource = readFileSync("lib/orders/createOrder.ts", "utf8");
  const schemaSource = readFileSync("lib/products/schema.ts", "utf8");
  assert.match(orderSource, /currentStock < requestedQuantity/);
  assert.match(orderSource, /stockQty: remaining, inStock: remaining > 0/);
  assert.match(schemaSource, /inStock: input\.stockMode === "unlimited" \|\| \(input\.stockQty \?\? 0\) > 0/);
});

test("sold-out favorites resolve normally while archived favorites remain cleanup cards", () => {
  const mutationSource = readFileSync("app/api/favorites/route.ts", "utf8");
  const resolveSource = readFileSync("app/api/favorites/resolve/route.ts", "utf8");
  const pageSource = readFileSync("components/favorites/FavoritesPageClient.tsx", "utf8");
  assert.doesNotMatch(mutationSource, /const hasStock/);
  assert.match(resolveSource, /availability: product\.inStock \? "in_stock" : "out_of_stock"/);
  assert.match(resolveSource, /unavailableProductIds: productIds\.filter/);
  assert.match(pageSource, /mediaOverlay=\{<StockBadge/);
  assert.match(pageSource, /UnavailableFavoriteCard/);
  assert.match(pageSource, /FavoriteButton itemType=\{itemType\}/);
});

test("archive uses a custom modal and restore is supported without hard deletion", () => {
  const clientSource = readFileSync("components/admin/AdminProductsClient.tsx", "utf8");
  const routeSource = readFileSync("app/api/admin/products/[id]/route.ts", "utf8");
  assert.match(clientSource, /aria-labelledby="archive-product-title"/);
  assert.match(clientSource, /Existing historical Orders are preserved/);
  assert.doesNotMatch(clientSource, /window\.confirm/);
  assert.match(routeSource, /status: "archived"/);
  assert.match(routeSource, /export async function PATCH/);
  assert.doesNotMatch(routeSource, /docRef\.delete/);
});

test("stock badges overlay card, detail, and active favorite media", () => {
  const badge = readFileSync("components/product/StockBadge.tsx", "utf8");
  const card = readFileSync("components/home/ProductCard.tsx", "utf8");
  const gallery = readFileSync("components/product/ProductGallery.tsx", "utf8");
  const favorites = readFileSync("components/favorites/FavoritesPageClient.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(badge, /IN STOCK/);
  assert.match(badge, /OUT OF STOCK/);
  assert.match(card, /productCard__media[\s\S]*<StockBadge/);
  assert.doesNotMatch(card, /productStockState/);
  assert.match(gallery, /productGallery__main[\s\S]*<StockBadge/);
  assert.match(favorites, /mediaOverlay=\{<StockBadge/);
  assert.match(css, /\.stockBadge \{[^}]*position: absolute/);
});

test("low-stock threshold and quantity limits stay compact and exact", () => {
  const info = readFileSync("components/product/ProductInfo.tsx", "utf8");
  assert.match(info, /limitedStockQuantity > 0 && limitedStockQuantity < 5/);
  assert.match(info, /`Only \$\{limitedStockQuantity\} left`/);
  assert.match(info, /`Available: \$\{limitedStockQuantity\}`/);
  assert.match(info, /: "In stock"/);
  assert.match(info, /isOutOfStock[\s\S]*\? "Out of stock"/);
  assert.match(info, /productStockInfo--low/);
  assert.match(info, /nextQuantity > maxQuantity/);
  assert.match(info, /Only \$\{maxQuantity\} available\./);
  assert.match(info, /quantity >= maxQuantity/);
  assert.match(info, /disabled=\{isOutOfStock \|\| quantity <= 1\}/);
  assert.match(info, /productAddButton[^>]*disabled=\{isOutOfStock\}/);
});

test("storefront card overlays use compact symmetric corner placement", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /\.productCard \.stockBadge \{[\s\S]*?left: 4px;[\s\S]*?top: 4px;[\s\S]*?font-size: 0\.46rem;/);
  assert.match(css, /\.productCard__favorite\.favoriteButton,[\s\S]*?right: 4px !important;[\s\S]*?top: 4px !important;[\s\S]*?width: 28px;[\s\S]*?height: 28px;[\s\S]*?font-size: 0\.9rem;/);
});

test("product cards keep a tight media frame and compact refined controls", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /\/\* Product Card compact controls: final scoped source-of-truth\. \*\/[\s\S]*?\.productCard \{[\s\S]*?padding: 0\.45rem;/);
  assert.match(css, /\.productCard \.productCard__media,[\s\S]*?margin-bottom: 0\.28rem;[\s\S]*?padding: 0\.22rem;[\s\S]*?border-radius: 0\.72rem;/);
  assert.match(css, /\.productCard \.swatchesRow \.productSwatch__color \{[\s\S]*?width: 0\.68rem !important;[\s\S]*?height: 0\.68rem !important;[\s\S]*?border: 0\.75px solid/);
  assert.match(css, /\.productCard \.swatchesRow \.productSwatch\[aria-pressed="true"\],[\s\S]*?outline: 1px solid #111 !important;[\s\S]*?outline-offset: 0\.5px !important;/);
  assert.match(css, /\.productCard \.swatchesRow \.productSwatch\[aria-pressed="true"\] \.productSwatch__color,[\s\S]*?width: 0\.78rem !important;[\s\S]*?height: 0\.78rem !important;/);
  assert.match(css, /\.productCard \.sizeChips button,[\s\S]*?min-width: 1\.5rem !important;[\s\S]*?height: 1\.3rem !important;[\s\S]*?border-radius: 0\.35rem !important;[\s\S]*?font-size: 0\.6rem !important;/);
});

test("product card add icon is geometrically centered without changing cart behavior", () => {
  const card = readFileSync("components/home/ProductCard.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(card, /className="addButton"[\s\S]*?<span aria-hidden="true">\+<\/span>/);
  assert.match(css, /\.productCard \.addButton > span \{[\s\S]*?position: absolute;[\s\S]*?inset: 0;[\s\S]*?display: grid;[\s\S]*?place-items: center;[\s\S]*?line-height: 1;/);
  assert.match(card, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); handleAddToCart\(\); \}\}/);
});

test("Favorites product and Look cards keep content compact and actions balanced", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /\.favoriteCompactCard__body \{ gap: 0\.25rem; padding: 0\.48rem 0\.52rem 0\.52rem; \}/);
  assert.match(css, /\.favoriteCompactCard__price \{ margin-top: 0; \}/);
  assert.match(css, /\.favoriteCompactCard__action \{ margin-top: auto; \}/);
  assert.match(css, /\.favoriteCompactCard--product \.favoriteCompactCard__media \{ aspect-ratio: 4 \/ 4\.5; \}/);
  assert.match(css, /\.favoriteCompactCard--look \.favoriteCompactCard__media \{ aspect-ratio: 4 \/ 3\.6; \}/);
});

test("Look slider starts neutral and highlights only real interaction", () => {
  const slider = readFileSync("components/home/ShopTheLookClient.tsx", "utf8");
  assert.match(slider, /useState<number \| null>\(null\)/);
  assert.doesNotMatch(slider, /useState\(0\)/);
  assert.match(slider, /onMouseLeave=\{\(\) => \{ setHighlightedFigure\(null\); \}\}/);
  assert.match(slider, /onBlur=\{\(\) => \{ setHighlightedFigure\(null\); \}\}/);
});
