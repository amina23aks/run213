import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("components/admin/AdminShell.tsx", "utf8");
const configRoute = readFileSync("app/api/admin/config/route.ts", "utf8");
const returns = readFileSync("lib/orders/returns.ts", "utf8");
const orderAdmin = readFileSync("lib/orders/admin.ts", "utf8");
const firebaseTypes = readFileSync("types/firebase.ts", "utf8");

test("placeholder Settings route and navigation are removed", () => {
  assert.equal(existsSync("app/admin/settings/page.tsx"), false);
  assert.equal(existsSync("components/admin/AdminPlaceholderPage.tsx"), false);
  assert.doesNotMatch(shell, /Settings|\/admin\/settings/);
});

test("return carrier cost stays server-authoritative and snapshotted", () => {
  assert.match(returns, /DEFAULT_RETURN_COST_DZD = 300/);
  assert.match(orderAdmin, /updates\.returnCostDzd = DEFAULT_RETURN_COST_DZD/);
  assert.match(orderAdmin, /transaction\.set\(returnEventRef,[\s\S]*returnCostDzd: DEFAULT_RETURN_COST_DZD/);
  assert.doesNotMatch(orderAdmin, /settings|client.*returnCostDzd/i);
});

test("no unused Firestore settings model remains", () => {
  assert.doesNotMatch(firebaseTypes, /\| "settings"/);
});

test("protected diagnostics expose configuration state, never secret values", () => {
  assert.match(configRoute, /verifyAdminRequest\(request\)/);
  assert.match(configRoute, /cloudinaryConfigured/);
  assert.match(configRoute, /cloudinaryEnvKeys\.filter\(\(key\) => !process\.env\[key\]\)/);
  assert.doesNotMatch(configRoute, /Response\.json\(\{[\s\S]*process\.env/);
  assert.doesNotMatch(configRoute, /API_SECRET:\s*process\.env|PRIVATE_KEY:\s*process\.env|TOKEN:\s*process\.env/);
});

test("admin UI contains no native browser dialogs", () => {
  const adminFiles = [
    "components/admin/AdminShell.tsx",
    "components/admin/orders/AdminStatusMenu.tsx",
    "components/admin/products/AdminProductForm.tsx",
  ];
  for (const path of adminFiles) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /\b(?:alert|confirm|prompt)\s*\(/);
  }
});
