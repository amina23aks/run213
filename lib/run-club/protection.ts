import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { createDurableRateLimit, type DurableRateLimit, type DurableRateLimitResult } from "@/lib/rate-limit";

export const RUN_CLUB_UPLOAD_UID_LIMIT = 6;
export const RUN_CLUB_UPLOAD_UID_WINDOW = "1 h" as const;
export const RUN_CLUB_UPLOAD_IP_LIMIT = 12;
export const RUN_CLUB_UPLOAD_IP_WINDOW = "1 h" as const;
export const RUN_CLUB_UPLOAD_GRANT_TTL_SECONDS = 15 * 60;

type RunClubEnvironment = "production" | "preview" | "development";
type UploadLimiters = { uid: DurableRateLimit; ip: DurableRateLimit };

export type RunClubUploadGrant = {
  uid: string;
  publicId: string;
  monthKey: string;
  fileType: string;
  declaredBytes: number;
  maxBytes: number;
};

const environment = resolveRunClubEnvironment(process.env.VERCEL_ENV);
const namespace = (scope: "uid" | "ip") => `run213:${environment}:run-club:upload:${scope}` as const;
const uidLimiter = createDurableRateLimit({ prefix: namespace("uid"), limit: RUN_CLUB_UPLOAD_UID_LIMIT, window: RUN_CLUB_UPLOAD_UID_WINDOW });
const ipLimiter = createDurableRateLimit({ prefix: namespace("ip"), limit: RUN_CLUB_UPLOAD_IP_LIMIT, window: RUN_CLUB_UPLOAD_IP_WINDOW });

export function resolveRunClubEnvironment(value: string | undefined): RunClubEnvironment {
  return value === "production" || value === "preview" ? value : "development";
}

export async function checkRunClubUploadLimits(
  input: { uid: string; ip: string },
  limiters: UploadLimiters = { uid: uidLimiter, ip: ipLimiter },
): Promise<DurableRateLimitResult> {
  const uidResult = await limiters.uid.limit(hashIdentifier("uid", input.uid));
  if (!uidResult.allowed) return uidResult;
  return ipLimiterOrInjected(limiters).limit(hashIdentifier("ip", input.ip));
}

function ipLimiterOrInjected(limiters: UploadLimiters) { return limiters.ip; }

function hashIdentifier(scope: "uid" | "ip", value: string) {
  return createHash("sha256").update(`run213:run-club:upload:${scope}:${value}`).digest("hex");
}

function redis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error("Redis unavailable");
  return Redis.fromEnv();
}

function grantKey(grantId: string) {
  return `run213:${environment}:run-club:grant:${grantId}`;
}

export async function createRunClubUploadGrant(value: RunClubUploadGrant) {
  const grantId = randomUUID();
  await redis().set(grantKey(grantId), JSON.stringify(value), { ex: RUN_CLUB_UPLOAD_GRANT_TTL_SECONDS, nx: true });
  return grantId;
}

/** GETDEL makes concurrent/replayed consumption succeed at most once. */
export async function consumeRunClubUploadGrant(grantId: string): Promise<RunClubUploadGrant | null> {
  const value = await redis().getdel<string>(grantKey(grantId));
  if (!value) return null;
  try { return typeof value === "string" ? JSON.parse(value) as RunClubUploadGrant : value as RunClubUploadGrant; }
  catch { return null; }
}
