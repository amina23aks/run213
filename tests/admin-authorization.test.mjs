import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  claimsWithAdminGranted,
  claimsWithAdminRevoked,
  manageAdminClaim,
} from "../scripts/admin-claims.mjs";

const authSource = await readFile("lib/admin-auth.ts", "utf8");
const rulesSource = await readFile("firestore.rules", "utf8");

async function adminRoutes(directory = "app/api/admin") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? adminRoutes(target) : entry.name === "route.ts" ? [target] : [];
  }));
  return files.flat();
}

test("canonical verifier distinguishes authentication and authorization", () => {
  assert.match(authSource, /verifyIdToken\(match\[1\]\)/);
  assert.match(authSource, /decodedToken\.admin !== true/);
  assert.match(authSource, /denied\("Authentication required\.", 401\)/);
  assert.match(authSource, /denied\("Admin access required\.", 403\)/);
  assert.doesNotMatch(authSource, /ADMIN_EMAIL|isConfiguredAdminEmail|request\.json|localStorage/);
});

test("every public Admin API handler uses and enforces the canonical verifier", async () => {
  const routes = await adminRoutes();
  assert.ok(routes.length >= 20);
  for (const route of routes) {
    const source = await readFile(route, "utf8");
    assert.match(source, /verifyAdminRequest\(request\)/, route);
    assert.match(source, /if \(!adminVerification\.ok\) return adminVerification\.response/, route);
    const verifyAt = source.indexOf("verifyAdminRequest(request)");
    const bodyAt = source.indexOf("request.json()", source.indexOf("export "));
    if (bodyAt >= 0) assert.ok(verifyAt < bodyAt, `${route} parses a body before authorization`);
  }
});

test("Firestore Admin semantics stay aligned and no email rule is introduced", () => {
  assert.match(rulesSource, /request\.auth != null && request\.auth\.token\.admin == true/);
  assert.doesNotMatch(rulesSource, /request\.auth\.token\.email|ADMIN_EMAIL/i);
});

test("claim transforms preserve unrelated claims and revoke admin only", () => {
  const existing = { support: true, tenant: "run213", admin: false };
  assert.deepEqual(claimsWithAdminGranted(existing), { support: true, tenant: "run213", admin: true });
  assert.deepEqual(claimsWithAdminRevoked({ ...existing, admin: true }), { support: true, tenant: "run213" });
});

test("claim manager fails safely when the exact Auth user does not exist", async () => {
  let wroteClaims = false;
  const auth = {
    getUserByEmail: async () => { throw Object.assign(new Error("missing"), { code: "auth/user-not-found" }); },
    setCustomUserClaims: async () => { wroteClaims = true; },
  };
  await assert.rejects(manageAdminClaim({ action: "grant", email: "missing@example.com", auth }), /does not exist/);
  assert.equal(wroteClaims, false);
});

test("there is no public endpoint for changing Admin claims", async () => {
  const routes = await adminRoutes("app/api");
  for (const route of routes) {
    assert.doesNotMatch(route, /admin.*(?:grant|claim)|(?:grant|claim).*admin/i);
    const source = await readFile(route, "utf8");
    assert.doesNotMatch(source, /setCustomUserClaims/);
  }
});
