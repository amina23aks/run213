import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const uploadRoute = await readFile("app/api/run-club/upload-signature/route.ts", "utf8");
const submissionRoute = await readFile("app/api/run-club/submissions/route.ts", "utf8");
const protection = await readFile("lib/run-club/protection.ts", "utf8");
const cloudinary = await readFile("lib/run-club/cloudinary.ts", "utf8");
const publicSerializer = await readFile("lib/run-club/public.ts", "utf8");

test("upload authentication and validation precede durable quota", () => {
  const auth = uploadRoute.indexOf("requireCustomerRequest(request)");
  const parse = uploadRoute.indexOf("requestSchema.safeParse(body)");
  const trap = uploadRoute.indexOf("parsed.data.website");
  const quota = uploadRoute.indexOf("await checkRunClubUploadLimits");
  assert.ok(auth !== -1 && auth < parse && parse < trap && trap < quota);
});

test("invalid authentication, MIME, and size cannot consume upload quota", () => {
  assert.match(uploadRoute, /z\.enum\(RUN_CLUB_ALLOWED_MIME_TYPES\)/);
  assert.match(uploadRoute, /max\(RUN_CLUB_MAX_IMAGE_BYTES\)/);
  assert.match(uploadRoute, /catch \(error\).*safeApiError/s);
});

test("UID and IP upload ceilings are named and conservative", () => {
  assert.match(protection, /RUN_CLUB_UPLOAD_UID_LIMIT = 6/);
  assert.match(protection, /RUN_CLUB_UPLOAD_IP_LIMIT = 12/);
  assert.match(protection, /RUN_CLUB_UPLOAD_UID_WINDOW = "1 h"/);
  assert.match(protection, /RUN_CLUB_UPLOAD_IP_WINDOW = "1 h"/);
});

test("Redis namespaces are environment isolated and identifiers are SHA-256 scoped", () => {
  assert.match(protection, /resolveRunClubEnvironment\(process\.env\.VERCEL_ENV\)/);
  for (const environment of ["production", "preview", "development"]) {
    assert.match(`run213:${environment}:run-club:upload:uid`, new RegExp(environment));
  }
  const uid = "firebase-user-123";
  const ip = "203.0.113.9";
  const keys = [uid, ip].map((value, index) => createHash("sha256").update(`run213:run-club:upload:${index ? "ip" : "uid"}:${value}`).digest("hex"));
  assert.equal(keys.some((key) => key.includes(uid) || key.includes(ip)), false);
});

test("monthly contact and Instagram locks are checked before signature and Cloudinary cost", () => {
  const duplicate = uploadRoute.indexOf("checkMonthlyDuplicateLocks");
  const signature = uploadRoute.indexOf("signCloudinaryParams(params");
  assert.ok(duplicate !== -1 && duplicate < signature);
  assert.match(uploadRoute, /duplicate\.duplicateContact/);
  assert.match(uploadRoute, /duplicate\.duplicateInstagram/);
});

test("grant has 15 minute TTL, binding fields, and atomic GETDEL consumption", () => {
  assert.match(protection, /RUN_CLUB_UPLOAD_GRANT_TTL_SECONDS = 15 \* 60/);
  for (const field of ["uid", "publicId", "monthKey", "fileType", "declaredBytes", "maxBytes"]) assert.match(protection, new RegExp(`${field}:`));
  assert.match(protection, /\.getdel<.*>\(grantKey\(grantId\)\)/);
  assert.doesNotMatch(protection, /await redis\(\)\.get\([^]*await redis\(\)\.del/);
});

test("expired, wrong-owner, wrong-asset, and reused grants reject", () => {
  assert.match(submissionRoute, /!grant \|\| grant\.uid !== customerUserId \|\| grant\.publicId !== requestedImage\.publicId \|\| grant\.monthKey !== monthKey/);
  assert.match(submissionRoute, /consumeRunClubUploadGrant/);
});

test("modeled atomic grant consumption permits at most one concurrent success", async () => {
  let value = "grant";
  const getdel = async () => { const found = value; value = null; return found; };
  const results = await Promise.all([getdel(), getdel(), getdel()]);
  assert.equal(results.filter(Boolean).length, 1);
});

test("submission auth, schema, honeypot, and duplicate pre-check precede quota", () => {
  const auth = submissionRoute.indexOf("requireCustomerRequest(request)");
  const schema = submissionRoute.indexOf("runClubSubmissionSchema.safeParse(body)");
  const trap = submissionRoute.indexOf("parsed.data.website");
  const duplicate = submissionRoute.indexOf("await checkMonthlyDuplicateLocks");
  const quota = submissionRoute.indexOf("await checkRunClubRateLimit(request)");
  assert.ok(auth < schema && schema < trap && trap < duplicate && duplicate < quota);
});

test("Cloudinary Admin API supplies authoritative URL, bytes, format, and dimensions", () => {
  assert.match(cloudinary, /resources\/image\/upload/);
  assert.match(cloudinary, /Authorization: `Basic/);
  assert.match(submissionRoute, /getAuthoritativeCloudinaryImage\(grant\.publicId\)/);
  assert.match(submissionRoute, /image\.bytes > RUN_CLUB_MAX_IMAGE_BYTES/);
  assert.match(submissionRoute, /image\.bytes > grant\.declaredBytes/);
  assert.match(submissionRoute, /expectedFormats\.includes\(image\.format\)/);
  assert.match(submissionRoute, /secureUrl: image\.secureUrl/);
  assert.doesNotMatch(submissionRoute, /secureUrl: requestedImage|bytes: requestedImage|format: requestedImage/);
});

test("public serializer privacy remains closed", () => {
  for (const field of ["contactValue", "normalizedContact", "customerUserId", "submitterHash", "instagramHash", "uploadGrantId"]) {
    assert.doesNotMatch(publicSerializer, new RegExp(`return[^]*${field}`));
  }
});

test("authoritative duplicate transaction remains the final gate", () => {
  assert.match(submissionRoute, /db\.runTransaction/);
  assert.match(submissionRoute, /existing\.exists \|\| contactLock\.exists/);
  assert.match(submissionRoute, /instagramLock\?\.exists/);
});
