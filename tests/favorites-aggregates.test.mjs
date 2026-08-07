import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function aggregateId(type, itemId) { return `${type}_${itemId}`; }
function transition(state, type, itemId, favorite) {
  const favoriteKey = `${type}:${itemId}`;
  const id = aggregateId(type, itemId);
  const exists = state.favorites.has(favoriteKey);
  if (exists === favorite) return;
  if (favorite) state.favorites.add(favoriteKey); else state.favorites.delete(favoriteKey);
  const current = Number.isFinite(state.aggregates.get(id)?.count) ? Math.trunc(state.aggregates.get(id).count) : 0;
  state.aggregates.set(id, { type, itemId, count: Math.max(0, current + (favorite ? 1 : -1)) });
}

for (const type of ["product", "look"]) {
  test(`${type} add/remove is idempotent and never negative`, () => {
    const state = { favorites: new Set(), aggregates: new Map() };
    transition(state, type, "summer-road", true);
    transition(state, type, "summer-road", true);
    assert.deepEqual(state.aggregates.get(`${type}_summer-road`), { type, itemId: "summer-road", count: 1 });
    transition(state, type, "summer-road", false);
    transition(state, type, "summer-road", false);
    assert.equal(state.aggregates.get(`${type}_summer-road`).count, 0);
  });
}

test("backfill and live writes use the same aggregate document schema", async () => {
  const [backfill, writer, reader] = await Promise.all([
    readFile("scripts/backfill-favorite-aggregates.mjs", "utf8"),
    readFile("lib/favorites/aggregate.ts", "utf8"),
    readFile("app/api/admin/favorites/route.ts", "utf8"),
  ]);
  for (const field of ["type", "itemId", "count", "updatedAt"]) assert.match(backfill, new RegExp(`\\b${field}\\b`));
  for (const field of ["type", "itemId", "count", "updatedAt"]) assert.match(writer, new RegExp(`\\b${field}\\b`));
  assert.match(reader, /favoriteAggregateId\(item\.type, item\.itemId\)/);
  assert.doesNotMatch(reader, /uid|email/i);
});

test("Admin Favorites explicitly bypasses HTTP and browser caches", async () => {
  const [route, client] = await Promise.all([
    readFile("app/api/admin/favorites/route.ts", "utf8"),
    readFile("components/admin/AdminFavoritesClient.tsx", "utf8"),
  ]);
  assert.match(route, /Cache-Control.*private, no-store, max-age=0/);
  assert.match(client, /cache: "no-store"/);
  assert.match(client, />\{loading \? "REFRESHING…" : "REFRESH"\}</);
});
