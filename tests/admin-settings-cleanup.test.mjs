import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("components/admin/AdminShell.tsx", "utf8");
const configRoute = readFileSync("app/api/admin/config/route.ts", "utf8");
const returns = readFileSync("lib/orders/returns.ts", "utf8");
const orderAdmin = readFileSync("lib/orders/admin.ts", "utf8");
const firebaseTypes = readFileSync("types/firebase.ts", "utf8");
const runClubAdmin = readFileSync("components/admin/AdminRunClubClient.tsx", "utf8");
const globalStyles = readFileSync("app/globals.css", "utf8");

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
    "components/admin/AdminRunClubClient.tsx",
    "components/admin/orders/AdminStatusMenu.tsx",
    "components/admin/products/AdminProductForm.tsx",
  ];
  for (const path of adminFiles) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /\b(?:alert|confirm|prompt)\s*\(/);
  }
});

test("approved Run Club rejection opens its visible confirmation on the first click", () => {
  assert.doesNotMatch(runClubAdmin, /isRejecting|setIsRejecting/);
  assert.match(runClubAdmin, /selected\.status === "approved" && !approvedRejectionConfirmed[\s\S]*setConfirmApprovedReject\(true\)/);
  assert.match(runClubAdmin, /ref=\{rejectButtonRef\}[\s\S]*onClick=\{\(\) => void moderate\("reject"\)\}/);
});

test("approved rejection confirmation is the top accessible modal layer", () => {
  const detailPosition = runClubAdmin.indexOf("submission-detail-title");
  const confirmationPosition = runClubAdmin.indexOf("approved-reject-title");
  assert.ok(detailPosition >= 0 && confirmationPosition > detailPosition);
  assert.match(runClubAdmin, /adminRunClubModalOverlay--nested[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(globalStyles, /\.adminRunClubModalOverlay \{[^}]*z-index: 1000[^}]*\}[\s\S]*\.adminRunClubModalOverlay--nested \{ z-index: 1001; \}/);
});

test("approved rejection cancellation and confirmation preserve intentional behavior", () => {
  assert.match(runClubAdmin, /if \(confirmApprovedReject\) closeApprovedRejectConfirmation\(\)/);
  assert.match(runClubAdmin, /requestAnimationFrame\(\(\) => rejectButtonRef\.current\?\.focus\(\)\)/);
  assert.match(runClubAdmin, /onMouseDown=\{\(event\) => \{ if \(event\.target === event\.currentTarget\) closeApprovedRejectConfirmation\(\); \}\}/);
  assert.match(runClubAdmin, /onClick=\{closeApprovedRejectConfirmation\}[\s\S]*autoFocus>CANCEL/);
  assert.match(runClubAdmin, /onClick=\{\(\) => void moderate\("reject", true\)\}[\s\S]*CONFIRM REJECTION/);
});
