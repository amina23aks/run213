import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin favorites uses stable cursor pagination and bounded batch hydration", () => {
  const source = read("app/api/admin/favorites/route.ts");
  assert.match(source, /orderBy\("count", "desc"\).*orderBy\(FieldPath\.documentId\(\), "asc"\).*limit\(PAGE_SIZE \+ 1\)/s);
  assert.match(source, /startAfter\(cursor\.count, cursor\.id\)/);
  assert.match(source, /db\.getAll\(\.\.\.refs\)/);
  assert.doesNotMatch(source, /SCAN_LIMIT|offset/);
});

test("wishlist pages by timestamp and document id instead of scanning a recent batch", () => {
  const source = read("app/api/admin/wishlist/route.ts");
  assert.match(source, /orderBy\("createdAt", "desc"\).*orderBy\(FieldPath\.documentId\(\), "desc"\).*limit\(PAGE_SIZE \+ 1\)/s);
  assert.match(source, /startAfter\(new Date\(cursor\.createdAt\), cursor\.id\)/);
  assert.doesNotMatch(source, /limit\(250\)|nextOffset/);
});

test("Run Club historical integrity fallbacks and eligible pools have hard bounds", () => {
  const security = read("lib/run-club/security.ts");
  const summary = read("app/api/admin/run-club/summary/route.ts");
  const draw = read("app/api/admin/run-club/months/[monthKey]/draw/route.ts");
  assert.match(security, /where\("customerUserId", "==", uid\)\.where\("monthKey", "==", monthKey\)\.limit\(1\)/);
  assert.match(summary, /limit\(RUN_CLUB_MAX_APPROVED \+ 1\)/);
  assert.match(draw, /limit\(RUN_CLUB_MAX_APPROVED \+ 1\)/);
});

test("public product catalog cache remains tagged for mutation invalidation", () => {
  const source = read("lib/firestore/products.ts");
  assert.match(source, /unstable_cache/);
  assert.match(source, /revalidate: 60, tags: \["products"\]/);
  assert.match(source, /where\("status", "==", "active"\)/);
});
