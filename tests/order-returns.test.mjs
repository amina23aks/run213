import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync("lib/orders/admin.ts", "utf8");
const route = readFileSync("app/api/admin/orders/[id]/status/route.ts", "utf8");
const modal = readFileSync("components/admin/orders/AdminStatusMenu.tsx", "utf8");

test("returned transition restores stock and correction reserves it in one Firestore transaction", () => {
  assert.match(service, /db\.runTransaction/);
  assert.match(service, /nextStatus === "returned"[\s\S]*restoreLimitedStock\(transaction, data\)/);
  assert.match(service, /currentStatus === "returned" && nextStatus === "delivered"[\s\S]*reserveLimitedStock\(transaction, data/);
  assert.match(service, /inventoryRestoredAt/);
});

test("stock helpers only affect snapshotted limited items", () => {
  const helpers = service.slice(service.indexOf("async function reserveLimitedStock"), service.indexOf("export class AdminOrderError"));
  assert.match(helpers, /item\.stockMode !== "limited"/);
  assert.doesNotMatch(helpers, /made_to_order|unlimited/);
});

test("return cost is admin-only validated whole DZD and historically snapshotted", () => {
  assert.ok(route.indexOf("verifyAdminRequest(request)") < route.indexOf("bodySchema.safeParse"));
  assert.match(route, /returnCostDzd: z\.number\(\)\.int\(\)\.min\(0\)\.max\(1_000_000\)/);
  assert.match(service, /updates\.returnCostDzd = returnCostDzd/);
  assert.match(service, /returnCostRecordedAt = FieldValue\.serverTimestamp/);
  assert.match(service, /statusHistory:[\s\S]*returnCostDzd/);
});

test("custom return modal requires an explicit cost without browser dialogs", () => {
  assert.match(modal, /RETURN COST/);
  assert.match(modal, /Enter 0 when the carrier charged no return fee/);
  assert.doesNotMatch(modal, /window\.(?:prompt|confirm)|\bprompt\(|\bconfirm\(/);
});

test("returned correction preserves historical return cost", () => {
  const correction = service.slice(service.indexOf('currentStatus === "returned"'), service.indexOf('if (nextStatus === "cancelled"'));
  assert.doesNotMatch(correction, /returnCostDzd/);
  assert.match(modal, /historical return cost stays recorded/);
});
