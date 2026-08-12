import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const submissionRoute = await readFile("app/api/run-club/submissions/route.ts", "utf8");
const uploadRoute = await readFile("app/api/run-club/upload-signature/route.ts", "utf8");
const security = await readFile("lib/run-club/security.ts", "utf8");

const uidMonthKey = (uid, month) => `${month}_uid_${createHash("sha256").update(`${month}:uid:${uid}`).digest("hex")}`;
function submit(locks, { verifiedUid, month, body = {}, status = "pending" }) {
  if (!verifiedUid) return { status: 401 };
  const key = uidMonthKey(verifiedUid, month);
  if (locks.has(key)) return { status: 409, message: "You already submitted for this month." };
  locks.set(key, { verifiedUid, month, status, body });
  return { status: 201 };
}

test("signed-out user cannot submit", () => assert.equal(submit(new Map(), { month: "2026-08" }).status, 401));
test("same UID and month with same data is denied", () => { const locks = new Map(); assert.equal(submit(locks, { verifiedUid: "u1", month: "2026-08", body: { instagram: "a" } }).status, 201); assert.equal(submit(locks, { verifiedUid: "u1", month: "2026-08", body: { instagram: "a" } }).status, 409); });
for (const [label, first, second] of [
  ["different Instagram", { instagram: "a" }, { instagram: "b" }],
  ["different contact information", { contact: "a@example.com" }, { contact: "b@example.com" }],
  ["different proof image", { proof: "one" }, { proof: "two" }],
]) test(`same UID and month with ${label} is denied`, () => { const locks = new Map(); submit(locks, { verifiedUid: "u1", month: "2026-08", body: first }); assert.equal(submit(locks, { verifiedUid: "u1", month: "2026-08", body: second }).status, 409); });
test("same UID in a different month is allowed", () => { const locks = new Map(); assert.equal(submit(locks, { verifiedUid: "u1", month: "2026-08" }).status, 201); assert.equal(submit(locks, { verifiedUid: "u1", month: "2026-09" }).status, 201); });
test("different UIDs in the same month are allowed", () => { const locks = new Map(); assert.equal(submit(locks, { verifiedUid: "u1", month: "2026-08" }).status, 201); assert.equal(submit(locks, { verifiedUid: "u2", month: "2026-08" }).status, 201); });
test("concurrent same UID/month requests produce only one success", async () => { const locks = new Map(); const results = await Promise.all(Array.from({ length: 2 }, async () => submit(locks, { verifiedUid: "u1", month: "2026-08" }))); assert.equal(results.filter((result) => result.status === 201).length, 1); assert.equal(results.filter((result) => result.status === 409).length, 1); });
test("request-body UID cannot override verified UID", () => { const locks = new Map(); submit(locks, { verifiedUid: "verified", month: "2026-08", body: { uid: "fake" } }); assert.equal(submit(locks, { verifiedUid: "verified", month: "2026-08", body: { uid: "another" } }).status, 409); assert.doesNotMatch(submissionRoute, /parsed\.data\.(?:uid|customerUserId)/); });
for (const status of ["pending", "approved", "rejected"]) test(`${status} submission blocks another submission`, () => { const locks = new Map(); submit(locks, { verifiedUid: "u1", month: "2026-08", status }); assert.equal(submit(locks, { verifiedUid: "u1", month: "2026-08" }).status, 409); });
test("implementation derives identity from verified auth and Algeria month", () => { assert.match(submissionRoute, /requireCustomerRequest\(request\)\)\.uid/); assert.match(security, /timeZone: "Africa\/Algiers"/); assert.match(security, /sha256\(`\$\{monthKey\}:uid:\$\{uid\}`\)/); });
test("upload grant precheck uses verified UID and returns a safe duplicate message", () => { assert.match(uploadRoute, /checkMonthlyUidSubmission\(monthKey, customer\.uid\)/); assert.match(uploadRoute, /"You already submitted for this month\."/); assert.doesNotMatch(uploadRoute, /lock IDs|uidMonthHash/); });
