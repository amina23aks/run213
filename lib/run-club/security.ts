import "server-only";
import { createHash } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

export type ApiErrorCode = "validation_failed" | "invalid_image" | "cloudinary_verification_failed" | "duplicate_submission" | "rate_limited" | "firestore_failed" | "upload_failed";

export function safeApiError(code: ApiErrorCode, message: string, status: number, fieldErrors?: Record<string, string>) {
  return Response.json({ ok: false, code, message, ...(fieldErrors ? { fieldErrors } : {}) }, { status });
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getAlgiersMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export function createSubmitterHash(monthKey: string, normalizedContact: string) {
  return sha256(`${monthKey}:${normalizedContact}`);
}

export function createIdentityHash(monthKey: string, type: "contact" | "instagram", normalizedValue: string) {
  return sha256(`${monthKey}:${type}:${normalizedValue}`);
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

export async function checkRunClubRateLimit(request: Request, limit = 5) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const windowKey = new Date(now).toISOString().slice(0, 13);
  const ipHash = sha256(`run-club:${getClientIp(request)}`);
  const ref = getAdminDb().collection("runClubRateLimits").doc(`${windowKey}_${ipHash}`);
  return getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = snapshot.exists ? Number(snapshot.get("count") ?? 0) : 0;
    if (count >= limit) return { allowed: false, resetAt: now + windowMs };
    transaction.set(ref, { ipHash, windowKey, count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(now + 2 * windowMs) }, { merge: true });
    return { allowed: true, resetAt: now + windowMs };
  });
}
