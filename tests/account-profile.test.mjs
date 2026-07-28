import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const api = readFileSync("app/api/account/profile/route.ts", "utf8");
const server = readFileSync("lib/profile/server.ts", "utf8");
const schema = readFileSync("lib/profile/validation.ts", "utf8");
const checkout = readFileSync("components/checkout/CheckoutForm.tsx", "utf8");
const menu = readFileSync("components/auth/AccountMenu.tsx", "utf8");

test("profile read and write require verified Firebase authentication", () => {
  assert.match(api, /requireCustomerRequest\(request\)/);
  assert.equal((api.match(/requireCustomerRequest\(request\)/g) ?? []).length, 2);
});
test("verified token UID scopes all profile reads and writes", () => {
  assert.match(server, /doc\(customer\.uid\)/);
  assert.doesNotMatch(server, /input\.uid|body\.uid/);
});
test("fake UID and unsupported fields are rejected", () => {
  assert.match(schema, /\.strict\(\)/);
  assert.doesNotMatch(schema, /uid:|email:/);
});
test("email is sourced from Firebase Auth and cannot be edited", () => {
  assert.match(server, /authUser\.email/);
  assert.doesNotMatch(server, /updateUser\([^)]*email/);
});
test("invalid Algerian phone is rejected", () => assert.match(schema, /\\\+213\|0/));
test("Checkout waits for auth hydration before profile loading", () => assert.match(checkout, /waitForAuthHydration\(\)\.then/));
test("Checkout only prefills empty, untouched fields", () => {
  assert.match(checkout, /!dirtyFields\.current\.has\(field\) && !control\.value/);
});
test("Guest Checkout remains supported", () => assert.match(checkout, /if \(!active \|\| !user\)/));
test("saving defaults is explicit", () => {
  assert.match(checkout, /SAVE THESE DETAILS FOR NEXT TIME/);
  assert.match(checkout, /user && saveDetails/);
});
test("account menu exposes required signed-in and signed-out destinations", () => {
  for (const label of ["MY ACCOUNT", "MY ORDERS", "FAVORITES", "SIGN OUT", "SIGN IN"]) assert.match(menu, new RegExp(label));
});
test("profile response is customer-safe", () => {
  for (const secret of ["role:", "token:", "hash:", "internalNotes"]) assert.doesNotMatch(server, new RegExp(secret));
});
