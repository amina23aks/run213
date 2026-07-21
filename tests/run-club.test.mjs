import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

const maxBytes = 5 * 1024 * 1024;
const formats = new Set(["jpg", "jpeg", "png", "webp"]);
const folder = "run213/run-club/pending/2026-07";
const validImage = { publicId: `${folder}/proof`, secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/proof.webp", width: 100, height: 100, format: "webp", bytes: 1000, version: "1", signature: "12345678901234567890" };
const valid = { name: "Runner", contact: "runner@example.com", instagram: "", wilaya: "Algiers", caption: "Just showed up.", consentAccepted: true, proofImage: validImage, website: "" };

function normalizeContact(value) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  return trimmed.replace(/[\s().-]/g, "").replace(/^00/, "+");
}
function duplicateKey(monthKey, contact) { return createHash("sha256").update(`${monthKey}:${normalizeContact(contact)}`).digest("hex"); }
function validate(input) {
  const keys = ["name", "contact", "instagram", "wilaya", "caption", "consentAccepted", "proofImage", "website"];
  const extras = Object.keys(input).filter((key) => !keys.includes(key));
  if (extras.length) return { ok: false, code: "validation_failed" };
  if (!input.name?.trim() || input.name.trim().length < 2 || input.name.trim().length > 80) return { ok: false };
  const contact = normalizeContact(input.contact ?? "");
  if (!(/^\S+@\S+\.\S+$/.test(contact) || /^\+?[0-9]{8,15}$/.test(contact))) return { ok: false };
  if (input.consentAccepted !== true) return { ok: false };
  const image = input.proofImage;
  if (!image || !formats.has(image.format) || image.bytes > maxBytes || !image.publicId.startsWith(`${folder}/`)) return { ok: false };
  return { ok: true };
}
function apiError(code, message, fieldErrors) { return { ok: false, code, message, ...(fieldErrors ? { fieldErrors } : {}) }; }

test("valid submission schema", () => assert.equal(validate(valid).ok, true));
test("invalid email/phone", () => assert.equal(validate({ ...valid, contact: "nope" }).ok, false));
test("missing consent", () => assert.equal(validate({ ...valid, consentAccepted: false }).ok, false));
test("unsupported image format", () => assert.equal(validate({ ...valid, proofImage: { ...validImage, format: "gif" } }).ok, false));
test("oversized image", () => assert.equal(validate({ ...valid, proofImage: { ...validImage, bytes: maxBytes + 1 } }).ok, false));
test("normalization", () => assert.equal(normalizeContact(" 0555 12-34-56 "), "0555123456"));
test("deterministic duplicate key", () => assert.equal(duplicateKey("2026-07", "Runner@Example.com"), duplicateKey("2026-07", " runner@example.com ")));
test("duplicate submission conflict", () => assert.deepEqual(apiError("duplicate_submission", "You already submitted a run for this month."), { ok: false, code: "duplicate_submission", message: "You already submitted a run for this month." }));
test("unsafe extra fields", () => assert.equal(validate({ ...valid, status: "approved" }).code, "validation_failed"));
test("Cloudinary folder verification", () => assert.equal(validate({ ...valid, proofImage: { ...validImage, publicId: "other/folder/proof" } }).ok, false));
test("safe API errors", () => assert.deepEqual(apiError("validation_failed", "Check the form fields and try again.", { name: "Name is required." }), { ok: false, code: "validation_failed", message: "Check the form fields and try again.", fieldErrors: { name: "Name is required." } }));
