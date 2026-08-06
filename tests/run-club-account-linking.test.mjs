import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const linkRoute = readFileSync("app/api/admin/run-club/submissions/[id]/customer/route.ts", "utf8");
const accountRoute = readFileSync("app/api/account/run-club/route.ts", "utf8");
const customerRuns = readFileSync("lib/run-club/customer.ts", "utf8");
const submitRoute = readFileSync("app/api/run-club/submissions/route.ts", "utf8");
const publicRuns = readFileSync("lib/run-club/public.ts", "utf8");
const account = readFileSync("components/account/AccountPageClient.tsx", "utf8");

test("admin linking and unlinking require verified authentication", () => {
  assert.match(linkRoute, /verifyAdminRequest\(request\)/);
  assert.match(linkRoute, /if \(!admin\).*Unauthorized.*401/s);
});
test("empty and nonexistent Firebase Auth UIDs are rejected", () => {
  assert.match(linkRoute, /trim\(\)\.min\(1\)/);
  assert.match(linkRoute, /getAdminAuth\(\)\.getUser/);
  assert.match(linkRoute, /No Firebase Authentication user exists/);
});
test("unowned submissions link transactionally without overwriting another owner", () => {
  assert.match(linkRoute, /runTransaction/);
  assert.match(linkRoute, /customerUserId: target\.uid/);
  assert.match(linkRoute, /DIFFERENT_OWNER/);
});
test("linking writes audit metadata and does not mutate moderation fields", () => {
  assert.match(linkRoute, /linkedToCustomerAt: FieldValue\.serverTimestamp\(\)/);
  assert.match(linkRoute, /linkedToCustomerBy: admin\.uid/);
  assert.match(linkRoute, /transaction\.update\(ref, \{ customerUserId: target\.uid, linkedToCustomerAt:[^}]+linkedToCustomerBy: admin\.uid \}\)/);
});
test("ownership query exposes Account A only, never Account B", () => {
  assert.match(customerRuns, /where\("customerUserId","==",customer\.uid\)/);
  const serializer = customerRuns.slice(customerRuns.indexOf("function safe"), customerRuns.indexOf("export async function listOwnedRuns"));
  assert.doesNotMatch(serializer, /contactValue|moderationHistory|linkedToCustomerBy/);
});
test("unlink clears ownership without deleting the submission", () => {
  assert.match(linkRoute, /customerUserId: null/);
  assert.match(linkRoute, /unlinkedFromCustomerAt/);
  assert.match(linkRoute, /unlinkedFromCustomerBy/);
  assert.doesNotMatch(linkRoute, /transaction\.delete/);
});
test("new authenticated submissions still use the verified UID", () => {
  assert.match(submitRoute, /verifyOptionalCustomerRequest/);
  assert.match(submitRoute, /customerUserId = .*\.uid \?\? null/);
});
test("account requests bypass cache and refresh on focus", () => {
  assert.match(accountRoute, /private, no-store/);
  assert.match(account, /cache:"no-store"/);
  assert.match(account, /addEventListener\("focus",refresh\)/);
});
test("public community remains approved-only", () => {
  assert.match(publicRuns, /status.*approved/);
});
test("exact Account dark icon assets exist and are used", () => {
  const icons = ["order-bag-dark.png", "heart-dark.png", "save-dark.png", "running-dark.png"];
  for (const icon of icons) {
    assert.equal(existsSync(`public/icons/${icon}`), true, icon);
    assert.match(account, new RegExp(`/icons/${icon.replace(".", "\\.")}`));
  }
  for (const path of account.matchAll(/icon="(\/icons\/[^"]+)"/g)) assert.equal(existsSync(`public${path[1]}`), true, path[1]);
});
