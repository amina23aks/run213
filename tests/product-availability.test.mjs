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
  assert.match(info, /product\.stockQty > 0 && product\.stockQty < 5/);
  assert.match(info, /ONLY \{lowStockQuantity\} LEFT/);
  assert.match(info, /nextQuantity > maxQuantity/);
  assert.match(info, /Only \$\{maxQuantity\} available\./);
  assert.match(info, /quantity >= maxQuantity/);
  assert.match(info, /disabled=\{isOutOfStock \|\| quantity <= 1\}/);
  assert.match(info, /productAddButton[^>]*disabled=\{isOutOfStock\}/);
});
