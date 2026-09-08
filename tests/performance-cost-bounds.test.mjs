import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin favorites ALL, PRODUCTS, and LOOKS use indexed stable cursor query shapes", () => {
  const source = read("app/api/admin/favorites/route.ts");
  const manifest = JSON.parse(read("firestore.indexes.json"));
  const favoriteIndexes = manifest.indexes
    .filter((index) => index.collectionGroup === "favoriteAggregates")
    .map((index) => index.fields.map(({ fieldPath, order }) => `${fieldPath}:${order}`).join(","));

  // ALL uses the unfiltered ranking index. PRODUCTS and LOOKS share the typed
  // ranking index because both values enter the same optional equality filter.
  assert.match(source, /requestedType === "product" \|\| requestedType === "look"/);
  assert.match(source, /if \(type\) query = query\.where\("type", "==", type\)/);
  assert.match(source, /orderBy\("count", "desc"\).*orderBy\(FieldPath\.documentId\(\), "asc"\).*limit\(PAGE_SIZE \+ 1\)/s);
  assert.match(source, /startAfter\(cursor\.count, cursor\.id\)/);
  assert.ok(favoriteIndexes.includes("count:DESCENDING,__name__:ASCENDING"));
  assert.ok(favoriteIndexes.includes("type:ASCENDING,count:DESCENDING,__name__:ASCENDING"));

  // The two filtered sum aggregations require count's ascending aggregation
  // segment; a descending ranking segment cannot satisfy that query shape.
  assert.match(source, /where\("type", "==", "product"\)\.aggregate\(\{ saves: AggregateField\.sum\("count"\) \}\)/);
  assert.match(source, /where\("type", "==", "look"\)\.aggregate\(\{ saves: AggregateField\.sum\("count"\) \}\)/);
  assert.ok(favoriteIndexes.includes("type:ASCENDING,count:ASCENDING,__name__:ASCENDING"));
});

test("admin favorites keeps aggregate reads and hydration within cost bounds", () => {
  const source = read("app/api/admin/favorites/route.ts");
  assert.match(source, /const PAGE_SIZE = 5/);
  assert.match(source, /limit\(PAGE_SIZE \+ 1\)/);
  assert.match(source, /snapshot\.docs\.slice\(0, PAGE_SIZE\)/);
  assert.match(source, /const refs = aggregates\.map/);
  assert.match(source, /db\.getAll\(\.\.\.refs\)/);
  assert.equal(source.match(/db\.getAll\(/g)?.length, 1);
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

test("public Look catalog uses bounded tagged caches and ISR pages", () => {
  const looks = read("lib/firestore/looks.ts");
  assert.match(looks, /unstable_cache/);
  assert.doesNotMatch(looks, /unstable_noStore|noStore\(\)/);
  assert.match(looks, /const READ_LIMIT = 60/);
  assert.match(looks, /revalidate: 60, tags: \["looks"\]/);
  assert.match(looks, /revalidate: 60, tags: \["looks", "products"\]/);
  assert.match(looks, /where\("status", "==", "active"\)/);

  for (const path of ["app/page.tsx", "app/product/[slug]/page.tsx", "app/look/[lookSlug]/page.tsx", "app/looks/[collectionSlug]/page.tsx"]) {
    const page = read(path);
    assert.match(page, /export const revalidate = 60/);
    assert.doesNotMatch(page, /force-dynamic/);
  }

  for (const path of ["app/product/[slug]/page.tsx", "app/look/[lookSlug]/page.tsx", "app/looks/[collectionSlug]/page.tsx"]) {
    assert.match(read(path), /export function generateStaticParams\(\) \{\s*return \[\];\s*\}/);
  }

  assert.match(read("app/shop/page.tsx"), /export const dynamic = "force-dynamic"/);
});

test("Admin Look writes batch canonical Product hydration and invalidate public Look data", () => {
  for (const path of ["app/api/admin/looks/route.ts", "app/api/admin/looks/[id]/route.ts"]) {
    const source = read(path);
    assert.match(source, /db\.getAll\(\.\.\.uniqueIds\.map/);
    assert.match(source, /revalidateTag\("looks", "max"\)/);
  }

  for (const path of ["app/api/admin/look-collections/route.ts", "app/api/admin/look-collections/[id]/route.ts"]) {
    assert.match(read(path), /revalidateTag\("looks", "max"\)/);
  }
});
