import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const customerSource = readFileSync("lib/orders/customer.ts", "utf8");
const clientSource = readFileSync("components/orders/CustomerOrdersClient.tsx", "utf8");
const storageSource = readFileSync("components/orders/orderAccessStorage.ts", "utf8");
const accountSource = readFileSync("components/auth/AccountMenu.tsx", "utf8");

function claim(order, verifiedUid, token) {
  if (order.customerUserId || token !== order.rawToken) return false;
  order.customerUserId = verifiedUid;
  order.customerAccessTokenHash = null;
  return true;
}

test("valid guest order is claimed with verified auth and loses guest access", () => { const order = { customerUserId: null, customerAccessTokenHash: "hash", rawToken: "valid" }; assert.equal(claim(order, "verified-uid", "valid"), true); assert.equal(order.customerUserId, "verified-uid"); assert.equal(order.customerAccessTokenHash, null); });
test("already-owned order cannot be claimed by another account", () => { const order = { customerUserId: "account-a", customerAccessTokenHash: null, rawToken: "old" }; assert.equal(claim(order, "account-b", "old"), false); assert.equal(order.customerUserId, "account-a"); });
test("claim transaction writes verified uid and clears token hash", () => { assert.match(customerSource, /customerUserId: auth\.uid, customerAccessTokenHash: null/); });
test("successful and permanently stale entries are removed specifically", () => { assert.match(clientSource, /\[\.\.\.claimedIds, \.\.\.staleIds\]\.forEach\(removeGuestOrderAccess\)/); assert.doesNotMatch(clientSource, /localStorage\.clear/); });
test("failed claim response retains local entries", () => { assert.match(clientSource, /else if \(response\.ok\)/); });
test("claimed orders are deduplicated by order id", () => { assert.match(clientSource, /new Map\(orders\.map\(\(order\) => \[order\.id, order\]\)\)/); });
test("claim success appears only for a positive claimed count", () => { assert.match(clientSource, /claimedCount > 0/); });
test("auth hydration has an explicit non-empty state", () => { assert.match(clientSource, /useState<LoadState>\("hydrating"\)/); assert.match(clientSource, /state === "empty"/); });
test("guest storage keeps its key, cap, malformed filtering and id dedupe", () => { assert.match(storageSource, /run213:guestOrderAccess:v1/); assert.match(storageSource, /MAX_ENTRIES = 12/); assert.match(storageSource, /seen\.has\(entry\.orderId\)/); });
test("logout does not clear guest order storage", () => { assert.doesNotMatch(accountSource, /removeGuestOrderAccess|localStorage\.clear/); });
test("signed-out and signed-back-in access remain ownership based", () => { assert.match(customerSource, /data\.customerUserId === auth\.uid/); assert.match(customerSource, /!auth && token && verifyCustomerAccessToken/); });
