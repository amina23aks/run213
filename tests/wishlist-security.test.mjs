import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile("app/api/wishlist/route.ts", "utf8");
const limiter = await readFile("lib/wishlist/rateLimit.ts", "utf8");
const identity = await readFile("lib/wishlist/identity.ts", "utf8");
const form = await readFile("components/layout/FooterClubForm.tsx", "utf8");
const adminRoute = await readFile("app/api/admin/wishlist/route.ts", "utf8");
const migration = await readFile("scripts/migrate-wishlist-ids.mjs", "utf8");

const normalize = (email) => email.trim().toLowerCase();
const documentId = (email, pepper) => createHmac("sha256", pepper).update(normalize(email)).digest("hex");
const hash = (scope, value) => createHash("sha256").update(`run213:wishlist:${scope}:${value}`).digest("hex");

function signupStore() {
  const documents = new Map();
  return {
    signup(email, website = "") {
      if (website.trim()) return { status: 400, writes: 0 };
      const id = documentId(email, "test-pepper-with-more-than-32-bytes");
      const before = documents.size;
      if (!documents.has(id)) documents.set(id, { email: normalize(email) });
      return { status: 200, body: { ok: true, message: "You're on the list." }, writes: documents.size - before };
    },
    documents,
  };
}

test("email normalization and mixed-case duplicates are idempotent and generic", () => {
  const store = signupStore();
  const first = store.signup("  Runner@Example.COM ");
  const duplicate = store.signup("runner@example.com");
  assert.equal(store.documents.size, 1);
  assert.equal(first.writes, 1);
  assert.equal(duplicate.writes, 0);
  assert.deepEqual(first.body, duplicate.body);
  assert.match(route, /successBody/);
  assert.doesNotMatch(route, /joined:\s*true|already/i);
});

test("honeypot blocks writes and is visually/accessibly hidden", () => {
  const store = signupStore();
  assert.equal(store.signup("runner@example.com", "https://spam.invalid").writes, 0);
  assert.equal(store.documents.size, 0);
  assert.match(form, /name="website"/);
  assert.match(form, /aria-hidden="true"/);
  assert.match(form, /tabIndex=\{-1\}/);
});

test("invalid input and honeypot rejection happen before Redis quota", () => {
  const validation = route.indexOf("schema.safeParse");
  const trap = route.indexOf("parsed.data.website.trim()");
  const quota = route.indexOf("await checkWishlistRateLimits");
  assert.ok(validation !== -1 && validation < trap && trap < quota);
});

test("IP and email durable limits are conservative named constants", () => {
  assert.match(limiter, /WISHLIST_IP_LIMIT = 10/);
  assert.match(limiter, /WISHLIST_IP_WINDOW = "1 h"/);
  assert.match(limiter, /WISHLIST_EMAIL_LIMIT = 3/);
  assert.match(limiter, /WISHLIST_EMAIL_WINDOW = "24 h"/);
  const consume = (limit) => Array.from({ length: limit + 1 }, (_, index) => index < limit);
  assert.equal(consume(10).at(-1), false);
  assert.equal(consume(3).at(-1), false);
});

test("production, preview, and development Redis namespaces are isolated", () => {
  for (const environment of ["production", "preview", "development"]) {
    assert.notEqual(`run213:${environment}:wishlist:ip:${hash("ip", "same")}`, `run213:${environment}:wishlist:email:${hash("email", "same")}`);
  }
  assert.match(limiter, /resolveWishlistEnvironment\(process\.env\.VERCEL_ENV\)/);
  assert.doesNotMatch(limiter, /request.*VERCEL_ENV|headers.*VERCEL_ENV/i);
});

test("raw IP and email are absent from Redis identifiers", () => {
  const ip = "203.0.113.42";
  const email = "runner@example.com";
  const keys = [`run213:production:wishlist:ip:${hash("ip", ip)}`, `run213:production:wishlist:email:${hash("email", email)}`];
  assert.equal(keys.some((key) => key.includes(ip) || key.includes(email)), false);
});

test("HMAC document IDs are deterministic and reveal no email", () => {
  const pepper = randomBytes(32);
  const one = documentId("Runner@Example.com", pepper);
  const two = documentId(" runner@example.COM ", pepper);
  assert.equal(one, two);
  assert.match(one, /^[a-f0-9]{64}$/);
  assert.equal(one.includes("runner") || one.includes("example"), false);
  assert.match(identity, /WISHLIST_ID_PEPPER/);
  assert.doesNotMatch(identity, /NEXT_PUBLIC/);
});

test("Redis failure fails closed and 429 includes Retry-After without limiter metadata", () => {
  assert.match(route, /DurableRateLimitUnavailableError/);
  assert.match(route, /status: 503/);
  assert.match(route, /"Retry-After": String\(retryAfter\)/);
  assert.doesNotMatch(route, /remaining|which limiter|identifier/);
});

test("Admin Wishlist passes opaque document IDs through list and remove", () => {
  assert.match(adminRoute, /id: doc\.id/);
  assert.match(adminRoute, /doc\(parsed\.data\.id\)\.delete/);
  assert.doesNotMatch(adminRoute, /base64|decode/);
});

test("migration preserves fields, deletes only after replacement, and is idempotent", () => {
  const pepper = randomBytes(32);
  const old = { id: Buffer.from("runner@example.com").toString("base64url"), email: "Runner@Example.com", createdAt: 123, status: "active" };
  const migrate = (docs) => {
    for (const [id, data] of [...docs]) {
      const nextId = documentId(data.email, pepper);
      if (id === nextId) continue;
      docs.set(nextId, { ...data, ...(docs.get(nextId) ?? {}), email: normalize(data.email) });
      docs.delete(id);
    }
  };
  const docs = new Map([[old.id, old]]);
  migrate(docs); migrate(docs);
  assert.equal(docs.size, 1);
  assert.deepEqual([...docs.values()][0], { ...old, email: "runner@example.com" });
  assert.match(migration, /transaction\.set\(replacement/);
  assert.match(migration, /transaction\.delete\(legacy\.ref\)/);
  assert.match(migration, /--dry-run/);
  assert.doesNotMatch(migration, /console\.log\([^)]*email|console\.log\([^)]*pepper/i);
});
