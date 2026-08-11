import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoutes = [
  "app/api/admin/looks/route.ts",
  "app/api/admin/looks/[id]/route.ts",
  "app/api/admin/look-collections/route.ts",
  "app/api/admin/look-collections/[id]/route.ts",
  "app/api/admin/uploads/image/route.ts",
  "app/api/admin/config/route.ts",
];

test("every Looks, Look Collections, upload, and config operation verifies admin first", async () => {
  for (const file of adminRoutes) {
    const source = await readFile(file, "utf8");
    const handlers = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)[\s\S]*?(?=\nexport async function |\n(?:async )?function |$)/g)];
    assert.ok(handlers.length > 0, `${file} must expose a protected handler`);
    for (const handler of handlers) {
      const body = handler[0];
      const verifyAt = body.indexOf("verifyAdminRequest(request)");
      assert.ok(verifyAt >= 0, `${file} ${handler[1]} must use the canonical verifier`);
      assert.match(body, /if \(!adminVerification\.ok\) return adminVerification\.response/);
      const firestoreAt = body.search(/getAdminDb\(|request\.json\(|request\.formData\(/);
      if (firestoreAt >= 0) assert.ok(verifyAt < firestoreAt, `${file} ${handler[1]} must authorize before data access`);
    }
  }
});

test("canonical verifier retains exact signed-out 401 and non-admin 403 semantics", async () => {
  const verifier = await readFile("lib/admin-auth.ts", "utf8");
  assert.match(verifier, /denied\("Authentication required\.", 401\)/);
  assert.match(verifier, /decodedToken\.admin !== true/);
  assert.match(verifier, /denied\("Admin access required\.", 403\)/);
});

test("Admin Looks clients use only protected Admin endpoints and invalidate on 401 or 403", async () => {
  const clients = await Promise.all([
    readFile("components/admin/looks/AdminLooksClient.tsx", "utf8"),
    readFile("components/admin/looks/AdminLookCollectionsClient.tsx", "utf8"),
  ]);
  const invalidation = await readFile("lib/admin-client-auth.ts", "utf8");
  for (const source of clients) {
    assert.match(source, /invalidateAdminAccessOnDenied/);
    assert.doesNotMatch(source, /fetch\("\/api\/(?!admin\/)/);
  }
  assert.match(invalidation, /response\.status === 401 \|\| response\.status === 403/);
  assert.match(invalidation, /run213:admin-auth-invalid/);
});

test("public storefront reads remain active-only and separate from Admin endpoints", async () => {
  const publicLooks = await readFile("lib/firestore/looks.ts", "utf8");
  assert.match(publicLooks, /where\("status", "==", "active"\)/);
  assert.match(publicLooks, /getActiveLookBySlug/);
  assert.match(publicLooks, /getActiveLookCollectionBySlug/);
  assert.doesNotMatch(publicLooks, /api\/admin|verifyAdminRequest/);
});
