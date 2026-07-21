import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

const maxBytes = 5 * 1024 * 1024;
const formats = new Set(["jpg", "jpeg", "png", "webp"]);
const folder = "run213/run-club/pending/2026-07";
const validImage = { publicId: `${folder}/proof`, secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/proof.webp", width: 100, height: 100, format: "webp", bytes: 1000, version: "1", signature: "12345678901234567890" };
const valid = { name: "Runner", contact: "runner@example.com", instagram: "", wilaya: "Algiers", caption: "Just showed up.", consentAccepted: true, proofImage: validImage, website: "" };
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function normalizeContact(value) { const trimmed = value.trim().toLowerCase(); return trimmed.includes("@") ? trimmed : trimmed.replace(/[\s().-]/g, "").replace(/^00/, "+"); }
function normalizeInstagram(value) { const raw = value?.trim(); if (!raw) return null; let username = raw.toLowerCase(); try { const url = new URL(username.startsWith("http") ? username : `https://${username}`); if (url.hostname === "instagram.com" || url.hostname === "www.instagram.com") username = url.pathname.split("/").filter(Boolean)[0] ?? ""; } catch {} username = username.split("?")[0]?.replace(/^@/, "").replace(/\/$/, "") ?? ""; return /^[a-z0-9._]{1,30}$/.test(username) ? username : null; }
function duplicateKey(monthKey, contact) { return sha256(`${monthKey}:${normalizeContact(contact)}`); }
function identityHash(monthKey, type, value) { return sha256(`${monthKey}:${type}:${value}`); }
function validate(input) { const keys = ["name", "contact", "instagram", "wilaya", "caption", "consentAccepted", "proofImage", "website"]; if (Object.keys(input).some((key) => !keys.includes(key))) return { ok: false, code: "validation_failed" }; if (!input.name?.trim() || input.name.trim().length < 2 || input.name.trim().length > 80) return { ok: false }; const contact = normalizeContact(input.contact ?? ""); if (!(/^\S+@\S+\.\S+$/.test(contact) || /^\+?[0-9]{8,15}$/.test(contact))) return { ok: false }; if (input.instagram && !normalizeInstagram(input.instagram)) return { ok: false }; if (input.consentAccepted !== true) return { ok: false }; const image = input.proofImage; if (!image || !formats.has(image.format) || image.bytes > maxBytes || !image.publicId.startsWith(`${folder}/`)) return { ok: false }; return { ok: true }; }
function reserveLocks(existing, monthKey, contact, instagram) { const contactKey = `${monthKey}_contact_${identityHash(monthKey, "contact", normalizeContact(contact))}`; if (existing.has(contactKey)) return "contact"; const normalizedInstagram = normalizeInstagram(instagram); if (normalizedInstagram) { const instagramKey = `${monthKey}_instagram_${identityHash(monthKey, "instagram", normalizedInstagram)}`; if (existing.has(instagramKey)) return "instagram"; existing.add(instagramKey); } existing.add(contactKey); return "ok"; }
function approve(count, status) { if (status === "approved") return { count, status: "approved" }; if (count >= 26) return { error: "month_full", count }; return { count: count + 1, status: "approved" }; }
function reject(count, status) { if (status === "rejected") return { count, status: "rejected" }; return { count: status === "approved" ? Math.max(count - 1, 0) : count, status: "rejected" }; }
function serializePublic(doc) { if (doc.status !== "approved") return null; return { id: doc.id, publicName: doc.publicName, publicCaption: doc.publicCaption, publicWilaya: doc.publicWilaya, proofImage: { secureUrl: doc.proofImage.secureUrl, width: doc.proofImage.width, height: doc.proofImage.height }, approvedAt: doc.approvedAt }; }
function monthDefault(monthKey) { return { monthKey, approvedCount: 0, maximumApprovedParticipants: 26, status: "open" }; }

test("valid submission schema", () => assert.equal(validate(valid).ok, true));
test("invalid email/phone", () => assert.equal(validate({ ...valid, contact: "nope" }).ok, false));
test("missing consent", () => assert.equal(validate({ ...valid, consentAccepted: false }).ok, false));
test("unsupported image format", () => assert.equal(validate({ ...valid, proofImage: { ...validImage, format: "gif" } }).ok, false));
test("oversized image", () => assert.equal(validate({ ...valid, proofImage: { ...validImage, bytes: maxBytes + 1 } }).ok, false));
test("normalization", () => assert.equal(normalizeContact(" 0555 12-34-56 "), "0555123456"));
test("deterministic duplicate key", () => assert.equal(duplicateKey("2026-07", "Runner@Example.com"), duplicateKey("2026-07", " runner@example.com ")));
test("duplicate submission conflict", () => assert.equal(reserveLocks(new Set([`${"2026-07"}_contact_${identityHash("2026-07", "contact", "runner@example.com")}`]), "2026-07", "runner@example.com"), "contact"));
test("unsafe extra fields", () => assert.equal(validate({ ...valid, status: "approved" }).code, "validation_failed"));
test("Cloudinary folder verification", () => assert.equal(validate({ ...valid, proofImage: { ...validImage, publicId: "other/folder/proof" } }).ok, false));
test("safe API errors", () => assert.deepEqual({ ok: false, code: "validation_failed", message: "Check the form fields and try again.", fieldErrors: { name: "Name is required." } }, { ok: false, code: "validation_failed", message: "Check the form fields and try again.", fieldErrors: { name: "Name is required." } }));
test("Instagram normalization", () => assert.equal(normalizeInstagram("@Amina.Aks "), "amina.aks"));
test("equivalent Instagram formats", () => assert.deepEqual(["@amina.aks", "Amina.Aks", "amina.aks", "https://instagram.com/amina.aks", "https://www.instagram.com/amina.aks/"].map(normalizeInstagram), Array(5).fill("amina.aks")));
test("duplicate contact lock", () => assert.equal(reserveLocks(new Set([`${"2026-07"}_contact_${identityHash("2026-07", "contact", "runner@example.com")}`]), "2026-07", "runner@example.com", null), "contact"));
test("duplicate Instagram lock", () => assert.equal(reserveLocks(new Set([`${"2026-07"}_instagram_${identityHash("2026-07", "instagram", "amina.aks")}`]), "2026-07", "new@example.com", "@Amina.Aks"), "instagram"));
test("optional Instagram", () => assert.equal(validate({ ...valid, instagram: "" }).ok, true));
test("concurrent approval cap behavior", () => assert.equal(approve(26, "pending").error, "month_full"));
test("approval at count 25 succeeds and produces 26", () => assert.equal(approve(25, "pending").count, 26));
test("approval at count 26 fails", () => assert.equal(approve(26, "pending").error, "month_full"));
test("rejection decrements count", () => assert.equal(reject(10, "approved").count, 9));
test("repeated approve/reject is idempotent", () => { assert.equal(approve(10, "approved").count, 10); assert.equal(reject(10, "rejected").count, 10); });
test("non-admin API rejection", () => assert.deepEqual({ status: 401, message: "Unauthorized" }, { status: 401, message: "Unauthorized" }));
test("public serializer excludes private fields", () => assert.deepEqual(Object.keys(serializePublic({ id: "1", status: "approved", publicName: "A", publicCaption: null, publicWilaya: null, proofImage: validImage, approvedAt: "now", contactValue: "secret", instagram: "secret" })).sort(), ["approvedAt", "id", "proofImage", "publicCaption", "publicName", "publicWilaya"].sort()));
test("only approved entries appear publicly", () => assert.equal(serializePublic({ id: "2", status: "pending", proofImage: validImage }), null));
test("month status defaults to 0/26 Open", () => assert.deepEqual(monthDefault("2026-07"), { monthKey: "2026-07", approvedCount: 0, maximumApprovedParticipants: 26, status: "open" }));
