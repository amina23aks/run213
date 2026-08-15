import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync("lib/orders/admin.ts", "utf8");
const route = readFileSync("app/api/admin/orders/[id]/status/route.ts", "utf8");
const modal = readFileSync("components/admin/orders/AdminStatusMenu.tsx", "utf8");
const returns = readFileSync("lib/orders/returns.ts", "utf8");

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

test("server automatically snapshots canonical 300 DZD on order, history, and event", () => {
  assert.match(returns, /DEFAULT_RETURN_COST_DZD = 300/);
  assert.match(service, /updates\.returnCostDzd = DEFAULT_RETURN_COST_DZD/);
  assert.match(service, /statusHistory:[\s\S]*returnCostDzd: DEFAULT_RETURN_COST_DZD/);
  assert.match(service, /transaction\.set\(returnEventRef,[\s\S]*returnCostDzd: DEFAULT_RETURN_COST_DZD/);
  assert.match(service, /returnCostRecordedAt = FieldValue\.serverTimestamp/);
});

test("strict Admin API rejects client return-cost spoofing", () => {
  assert.ok(route.indexOf("verifyAdminRequest(request)") < route.indexOf("bodySchema.safeParse"));
  assert.match(route, /\}\)\.strict\(\)/);
  assert.doesNotMatch(route, /returnCostDzd/);
});

test("custom return modal has no cost input or browser dialogs", () => {
  assert.match(modal, /record a 300 DZD return carrier cost/);
  assert.match(modal, /CONFIRM RETURN/);
  assert.doesNotMatch(modal, /inputMode="numeric"|aria-label="Return cost"|window\.(?:prompt|confirm)|\bprompt\(|\bconfirm\(/);
});

test("each legitimate return preserves an immutable event and correction preserves order history", () => {
  assert.match(service, /collection\("returnEvents"\)\.doc\(\)/);
  assert.match(service, /previousStatus: currentStatus/);
  const correction = service.slice(service.indexOf('currentStatus === "returned"'), service.indexOf('if (nextStatus === "cancelled"'));
  assert.doesNotMatch(correction, /returnCostDzd/);
});
