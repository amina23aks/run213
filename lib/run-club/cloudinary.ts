import "server-only";
import { createHash, randomUUID } from "crypto";

export function getCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured.");
  return { cloudName, apiKey, apiSecret };
}

export function createRunClubPendingFolder(monthKey: string) {
  return `run213/run-club/pending/${monthKey}`;
}

export function createRunClubPublicId(monthKey: string) {
  return `${createRunClubPendingFolder(monthKey)}/${randomUUID()}`;
}

export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string) {
  const source = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
  return createHash("sha1").update(`${source}${apiSecret}`).digest("hex");
}

export function verifyUploadSignature(input: { publicId: string; version: string; signature?: string }, apiSecret: string) {
  if (!input.signature) return false;
  const expected = signCloudinaryParams({ public_id: input.publicId, version: input.version }, apiSecret);
  return expected === input.signature;
}
