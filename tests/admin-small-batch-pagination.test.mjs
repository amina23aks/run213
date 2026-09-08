import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin list APIs use the required bounded batches", () => {
  assert.match(read("lib/orders/admin.ts"), /DEFAULT_LIMIT = 10/);
  assert.match(read("app/api/admin/products/route.ts"), /DEFAULT_LIMIT = 8/);
  assert.match(read("app/api/admin/favorites/route.ts"), /PAGE_SIZE = 5/);
  assert.match(read("app/api/admin/wishlist/route.ts"), /PAGE_SIZE = 5/);
  assert.match(read("app/api/admin/looks/route.ts"), /DEFAULT_LIMIT = 5/);
  assert.match(read("app/api/admin/look-collections/route.ts"), /DEFAULT_LIMIT = 5/);
  assert.match(read("app/api/admin/run-club/submissions/route.ts"), /default\(8\)/);
});

test("cursor pages append uniquely and filter changes replace the first page", () => {
  for (const path of ["components/admin/orders/AdminOrdersClient.tsx", "components/admin/AdminProductsClient.tsx", "components/admin/AdminFavoritesClient.tsx", "components/admin/AdminWishlistClient.tsx", "components/admin/looks/AdminLooksClient.tsx", "components/admin/looks/AdminLookCollectionsClient.tsx", "components/admin/AdminRunClubClient.tsx"]) {
    assert.match(read(path), /new Set\(/, `${path} must de-duplicate appended cursor pages`);
  }
  const orders = read("components/admin/orders/AdminOrdersClient.tsx");
  assert.match(orders, /load\(null, "replace"\)/);
  assert.match(orders, /params\.set\("cursor", nextCursor\)/);
  const runClub = read("components/admin/AdminRunClubClient.tsx");
  assert.match(runClub, /\[adminFetch, month, status\]/);
  assert.match(runClub, /load\(true, cursor\)/);
});

test("full aggregates and editor reference data remain separate from visible pages", () => {
  const summary = read("app/api/admin/run-club/summary/route.ts");
  assert.match(summary, /\.count\(\)\.get\(\)/);
  const wishlist = read("app/api/admin/wishlist/route.ts");
  assert.match(wishlist, /collection\.count\(\)\.get\(\)/);
  const looks = read("components/admin/looks/AdminLooksClient.tsx");
  assert.match(looks, /look-collections\?limit=50/);
  assert.match(looks, /products\?limit=50/);
  assert.match(read("app/api/admin/overview/route.ts"), /getAdminOverview/);
  assert.match(read("lib/admin/overview.ts"), /OVERVIEW_ORDER_READ_LIMIT = 500/);
});

test("admin search is server bounded and no retention behavior is introduced", () => {
  assert.match(read("lib/orders/admin.ts"), /adminSearchTokens", "array-contains"/);
  assert.match(read("app/api/admin/wishlist/route.ts"), /collection\.doc\(getWishlistDocumentId\(normalizedEmail\)\)\.get\(\)/);
  assert.doesNotMatch(read("lib/orders/admin.ts"), /delete\(|retention|archive.*order/i);
});

test("overview recent wishlist query is exactly five documents", () => {
  const overview = read("lib/admin/overview.ts");
  assert.match(overview, /collection\("wishlistSignups"\).*limit\(5\)\.get\(\)/);
  assert.match(read("components/admin/AdminOverviewClient.tsx"), /RECENT WISHLIST/);
});
