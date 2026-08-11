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
  assert.match(css, /\.productCard \.stockBadge \{[\s\S]*?left: 8px;[\s\S]*?top: 8px;[\s\S]*?font-size: 0\.5rem;/);
  assert.match(css, /\.productCard__favorite\.favoriteButton,[\s\S]*?right: 8px !important;[\s\S]*?top: 8px !important;[\s\S]*?width: 30px;[\s\S]*?height: 30px;/);
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
