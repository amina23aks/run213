import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [mutationRoute, resolveRoute, limiterSource, aggregateSource, storageSource, adminRoute] = await Promise.all([
  readFile("app/api/favorites/route.ts", "utf8"),
  readFile("app/api/favorites/resolve/route.ts", "utf8"),
  readFile("lib/favorites/rateLimit.ts", "utf8"),
  readFile("lib/favorites/aggregate.ts", "utf8"),
  readFile("context/favorites-storage.ts", "utf8"),
  readFile("app/api/admin/favorites/route.ts", "utf8"),
]);

function transition(state, favorite) {
  if (state.exists === favorite) return state;
  return { exists: favorite, count: Math.max(0, state.count + (favorite ? 1 : -1)) };
}

test("active Product and Look targets are checked in the mutation transaction", () => {
  assert.match(mutationRoute, /type === "product" \? "products" : "looks"/);
  assert.match(mutationRoute, /transaction\.getAll\(targetRef, favoriteRef, aggregateRef\)/);
  assert.match(mutationRoute, /isAvailableFavoriteTarget\(type, target\.data\(\)\)/);
  assert.match(mutationRoute, /data\.status !== "active"/);
  assert.match(mutationRoute, /code: "ITEM_UNAVAILABLE"/);
});

test("nonexistent, draft, and archived targets cannot reach favorite creation", () => {
  const canCreate = (target) => Boolean(target?.exists && target.status === "active");
  assert.equal(canCreate(undefined), false);
  assert.equal(canCreate({ exists: true, status: "draft" }), false);
  assert.equal(canCreate({ exists: true, status: "archived" }), false);
  assert.equal(canCreate({ exists: true, status: "active" }), true);
  const handler = mutationRoute.slice(mutationRoute.indexOf("export async function POST"));
  assert.ok(handler.indexOf("!target.exists") < handler.indexOf("transaction.create(favoriteRef"));
  assert.ok(handler.indexOf("!target.exists") < handler.indexOf("applyFavoriteAggregate"));
});

test("stale favorites remain removable without resolving the target", () => {
  assert.match(mutationRoute, /await transaction\.getAll\(favoriteRef, aggregateRef\)/);
  assert.match(mutationRoute, /transaction\.delete\(favoriteRef\)/);
});

test("mutation remains idempotent and aggregate counts never become negative", () => {
  let state = { exists: false, count: 0 };
  state = transition(state, true);
  state = transition(state, true);
  assert.deepEqual(state, { exists: true, count: 1 });
  state = transition(state, false);
  state = transition(state, false);
  assert.deepEqual(state, { exists: false, count: 0 });
  assert.match(mutationRoute, /if \(current\.exists\) return/);
  assert.match(mutationRoute, /if \(!current\.exists\) return/);
  assert.match(aggregateSource, /Math\.max\(0,/);
  assert.match(aggregateSource, /return `\$\{type\}_\$\{itemId\}`/);
});

test("mutation UID/IP limits are durable, hashed, and environment isolated", () => {
  assert.match(limiterSource, /FAVORITE_MUTATION_UID_LIMIT = 120/);
  assert.match(limiterSource, /FAVORITE_MUTATION_IP_LIMIT = 300/);
  assert.match(limiterSource, /FAVORITE_RATE_LIMIT_WINDOW = "1 h"/);
  assert.match(limiterSource, /run213:\$\{environment\}:favorites:\$\{operation\}:\$\{scope\}/);
  assert.match(limiterSource, /createHash\("sha256"\)/);
  assert.match(limiterSource, /value === "production" \|\| value === "preview" \? value : "development"/);
  assert.doesNotMatch(limiterSource, /\.limit\(input\.(?:uid|ip)\)/);
});

test("mutation returns generic rate-limit and fail-closed responses", () => {
  assert.match(mutationRoute, /status: 429/);
  assert.match(mutationRoute, /"Retry-After": String\(retryAfter\)/);
  assert.match(mutationRoute, /DurableRateLimitUnavailableError/);
  assert.match(mutationRoute, /status: 503/);
  assert.doesNotMatch(mutationRoute, /UID limiter|IP limiter|which limiter/i);
});

test("public resolve keeps bounds, validates first, and deduplicates before batched reads", () => {
  assert.match(resolveRoute, /MAX_IDS_PER_TYPE = 80/);
  assert.match(resolveRoute, /z\.array\(favoriteIdSchema\)\.max\(MAX_IDS_PER_TYPE\)/);
  const handler = resolveRoute.slice(resolveRoute.indexOf("export async function POST"));
  assert.ok(handler.indexOf("resolveSchema.parse") < handler.indexOf("checkFavoriteResolveRateLimit"));
  assert.ok(resolveRoute.indexOf("const productIds = unique") < resolveRoute.indexOf("getActiveProductsByIds(productIds)"));
  assert.match(resolveRoute, /Promise\.all/);
});

test("resolve has a hashed environment-isolated 120/hour IP limit and safe 429", () => {
  assert.match(limiterSource, /FAVORITE_RESOLVE_IP_LIMIT = 120/);
  assert.match(limiterSource, /namespace\("resolve", "ip"\)/);
  assert.match(limiterSource, /hashFavoriteIdentifier\("resolve:ip", ip\)/);
  assert.match(resolveRoute, /status: 429/);
  assert.match(resolveRoute, /"Retry-After": String\(retryAfter\)/);
  assert.doesNotMatch(limiterSource, /limiter\.limit\(ip\)/);
});

test("resolve exposes only explicit active customer-safe fields", () => {
  assert.match(resolveRoute, /getActiveProductsByIds/);
  assert.match(resolveRoute, /getActiveLooksByIds/);
  assert.doesNotMatch(resolveRoute, /sourceProduct: \{ \.\.\.product/);
  for (const forbidden of ["costPriceDzd", "basePriceDzd", "stockQty", "createdAt", "updatedAt"]) {
    assert.doesNotMatch(resolveRoute, new RegExp(`\\b${forbidden}\\b`));
  }
});

test("guest local storage and aggregate-only Admin architecture remain unchanged", () => {
  assert.match(storageSource, /localStorage/);
  assert.doesNotMatch(adminRoute, /customerEmail|customerUid|userFavorites/);
  assert.match(adminRoute, /favoriteAggregates/);
});
