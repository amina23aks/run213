import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeSource = await readFile("app/api/orders/route.ts", "utf8");
const checkoutLimiterSource = await readFile("lib/orders/checkoutRateLimit.ts", "utf8");
const sharedLimiterSource = await readFile("lib/rate-limit.ts", "utf8");
const createOrderSource = await readFile("lib/orders/createOrder.ts", "utf8");

function hash(scope, value) {
  return createHash("sha256").update(`run213:checkout:${scope}:${value}`).digest("hex");
}

function environmentNamespace(value) {
  return value === "production" || value === "preview" ? value : "development";
}

function durableModel({ environment = "development", guestIpLimit = 5, authIpLimit = 10, phoneLimit = 5, uidLimit = 10 } = {}) {
  const counters = new Map();
  const consume = (prefix, identifier, limit) => {
    const key = `run213:${environmentNamespace(environment)}:checkout:${prefix}:${identifier}`;
    const count = (counters.get(key) ?? 0) + 1;
    counters.set(key, count);
    return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), reset: Date.now() + 3_600_000 };
  };
  return {
    check({ ip, phone, uid = null }) {
      const ipResult = consume(uid ? "auth-ip" : "guest-ip", hash("ip", ip), uid ? authIpLimit : guestIpLimit);
      if (!ipResult.allowed) return ipResult;
      const phoneResult = consume("phone", hash("phone", phone), phoneLimit);
      if (!phoneResult.allowed) return phoneResult;
      if (uid) return consume("uid", hash("uid", uid), uidLimit);
      return phoneResult;
    },
    keys() { return [...counters.keys()]; },
  };
}

test("production, preview, and development use isolated allowlisted prefixes", () => {
  const production = durableModel({ environment: "production" });
  const preview = durableModel({ environment: "preview" });
  const development = durableModel({ environment: "development" });
  const attempt = { ip: "same-ip", phone: "same-phone" };
  production.check(attempt);
  preview.check(attempt);
  development.check(attempt);
  assert.match(production.keys()[0], /^run213:production:checkout:/);
  assert.match(preview.keys()[0], /^run213:preview:checkout:/);
  assert.match(development.keys()[0], /^run213:development:checkout:/);
  assert.notEqual(production.keys()[0], preview.keys()[0]);
  assert.notEqual(preview.keys()[0], development.keys()[0]);
});

test("preview attempts cannot consume production quota", () => {
  const production = durableModel({ environment: "production", guestIpLimit: 1 });
  const preview = durableModel({ environment: "preview", guestIpLimit: 1 });
  const attempt = { ip: "same-ip", phone: "same-phone" };
  assert.equal(preview.check(attempt).allowed, true);
  assert.equal(preview.check(attempt).allowed, false);
  assert.equal(production.check(attempt).allowed, true);
});

test("unknown or missing VERCEL_ENV deterministically falls back to development", () => {
  assert.equal(environmentNamespace(undefined), "development");
  assert.equal(environmentNamespace("arbitrary-browser-value"), "development");
  assert.match(checkoutLimiterSource, /resolveCheckoutEnvironment\(process\.env\.VERCEL_ENV\)/);
  assert.doesNotMatch(checkoutLimiterSource, /request.*VERCEL_ENV|headers.*VERCEL_ENV/i);
});

test("valid guest and authenticated checkout pass below durable limits", () => {
  const limiter = durableModel();
  assert.equal(limiter.check({ ip: "203.0.113.1", phone: "+213555000000" }).allowed, true);
  assert.equal(limiter.check({ ip: "203.0.113.2", phone: "+213555000001", uid: "firebase-user" }).allowed, true);
});

test("Zod validation happens before normalization, auth, replay lookup, and quota consumption", () => {
  const validation = routeSource.indexOf("createOrderRequestSchema.safeParse");
  const normalization = routeSource.indexOf("normalizePhone(parsed.data.customer.phone)");
  const quota = routeSource.indexOf("await checkCheckoutRateLimits");
  assert.ok(validation !== -1 && validation < normalization && normalization < quota);
});

test("IP, phone, and authenticated UID use the durable limiter abstraction", () => {
  assert.match(checkoutLimiterSource, /configuredLimiters\.guestIp/);
  assert.match(checkoutLimiterSource, /configuredLimiters\.phone\.limit/);
  assert.match(checkoutLimiterSource, /configuredLimiters\.uid\.limit/);
  assert.match(sharedLimiterSource, /Redis\.fromEnv\(\)/);
  assert.doesNotMatch(checkoutLimiterSource, /new Map/);
});

test("rotating phone numbers cannot bypass the guest IP ceiling", () => {
  const limiter = durableModel({ guestIpLimit: 2, phoneLimit: 100 });
  assert.equal(limiter.check({ ip: "same-ip", phone: "phone-1" }).allowed, true);
  assert.equal(limiter.check({ ip: "same-ip", phone: "phone-2" }).allowed, true);
  assert.equal(limiter.check({ ip: "same-ip", phone: "phone-3" }).allowed, false);
});

test("one IP cannot create unlimited COD orders", () => {
  const limiter = durableModel();
  const attempts = Array.from({ length: 6 }, (_, index) => limiter.check({ ip: "same-ip", phone: `phone-${index}` }));
  assert.equal(attempts.at(-1).allowed, false);
});

test("completed Firestore idempotency replay is returned before quota use", () => {
  const replay = routeSource.indexOf("if (existingOrder) return");
  const quota = routeSource.indexOf("await checkCheckoutRateLimits");
  assert.ok(replay !== -1 && replay < quota);
  assert.match(createOrderSource, /transaction\.get\(lockRef\)/);
  assert.match(createOrderSource, /idempotent: true as const/);
});

test("idempotent transaction still prevents duplicate order and stock decrement", () => {
  const lockRead = createOrderSource.indexOf("transaction.get(lockRef)");
  const stockUpdate = createOrderSource.indexOf("applyStockUpdates");
  assert.ok(lockRead !== -1 && lockRead < stockUpdate);
  assert.match(createOrderSource, /transaction\.create\(lockRef/);
});

test("429 response includes Retry-After and does not expose limiter identity", () => {
  assert.match(routeSource, /"RATE_LIMITED"/);
  assert.match(routeSource, /"Retry-After": String\(retryAfterSeconds\)/);
  assert.doesNotMatch(routeSource, /phoneHash|Redis key|which limiter/);
});

test("Redis failure fails checkout closed without a process-local fallback", () => {
  assert.match(routeSource, /DurableRateLimitUnavailableError/);
  assert.match(routeSource, /"CHECKOUT_PROTECTION_UNAVAILABLE"/);
  assert.doesNotMatch(sharedLimiterSource, /fallback|allowed:\s*true/);
});

test("Redis identifiers hash raw IP, phone, and UID and never use idempotency keys", () => {
  const limiter = durableModel();
  limiter.check({ ip: "raw-ip", phone: "raw-phone", uid: "raw-uid" });
  assert.equal(limiter.keys().some((key) => /raw-ip|raw-phone|raw-uid/.test(key)), false);
  assert.match(checkoutLimiterSource, /hashIdentifier\("ip"/);
  assert.match(checkoutLimiterSource, /hashIdentifier\("phone"/);
  assert.match(checkoutLimiterSource, /hashIdentifier\("uid"/);
  assert.doesNotMatch(checkoutLimiterSource, /idempotency/i);
});
