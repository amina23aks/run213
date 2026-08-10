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

export type AuthoritativeCloudinaryImage = { publicId: string; secureUrl: string; width: number; height: number; format: string; bytes: number; resourceType: string };

export async function getAuthoritativeCloudinaryImage(publicId: string): Promise<AuthoritativeCloudinaryImage> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${encodeURIComponent(publicId)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` }, cache: "no-store",
  });
  if (!response.ok) throw new Error("Cloudinary asset lookup failed.");
  const asset: unknown = await response.json();
  if (!asset || typeof asset !== "object") throw new Error("Invalid Cloudinary asset.");
  const value = asset as Record<string, unknown>;
  if (typeof value.public_id !== "string" || typeof value.secure_url !== "string" || typeof value.width !== "number" || typeof value.height !== "number" || typeof value.format !== "string" || typeof value.bytes !== "number" || typeof value.resource_type !== "string") throw new Error("Invalid Cloudinary asset.");
  return { publicId: value.public_id, secureUrl: value.secure_url, width: value.width, height: value.height, format: value.format.toLowerCase(), bytes: value.bytes, resourceType: value.resource_type };
}
