import "server-only";

import { createHash } from "node:crypto";
import { createDurableRateLimit, type DurableRateLimit, type DurableRateLimitResult } from "@/lib/rate-limit";

export const FAVORITE_MUTATION_UID_LIMIT = 120;
export const FAVORITE_MUTATION_IP_LIMIT = 300;
export const FAVORITE_RESOLVE_IP_LIMIT = 120;
export const FAVORITE_RATE_LIMIT_WINDOW = "1 h" as const;

type FavoritesEnvironment = "production" | "preview" | "development";
type MutationLimiters = { uid: DurableRateLimit; ip: DurableRateLimit };

const environment = resolveFavoritesEnvironment(process.env.VERCEL_ENV);
const namespace = (operation: "mutation" | "resolve", scope: "uid" | "ip") =>
  `run213:${environment}:favorites:${operation}:${scope}` as const;

const mutationUidLimiter = createDurableRateLimit({ prefix: namespace("mutation", "uid"), limit: FAVORITE_MUTATION_UID_LIMIT, window: FAVORITE_RATE_LIMIT_WINDOW });
const mutationIpLimiter = createDurableRateLimit({ prefix: namespace("mutation", "ip"), limit: FAVORITE_MUTATION_IP_LIMIT, window: FAVORITE_RATE_LIMIT_WINDOW });
const resolveIpLimiter = createDurableRateLimit({ prefix: namespace("resolve", "ip"), limit: FAVORITE_RESOLVE_IP_LIMIT, window: FAVORITE_RATE_LIMIT_WINDOW });

export function resolveFavoritesEnvironment(value: string | undefined): FavoritesEnvironment {
  return value === "production" || value === "preview" ? value : "development";
}

export async function checkFavoriteMutationRateLimits(
  input: { uid: string; ip: string },
  limiters: MutationLimiters = { uid: mutationUidLimiter, ip: mutationIpLimiter },
): Promise<DurableRateLimitResult> {
  const uidResult = await limiters.uid.limit(hashFavoriteIdentifier("mutation:uid", input.uid));
  if (!uidResult.allowed) return uidResult;
  return limiters.ip.limit(hashFavoriteIdentifier("mutation:ip", input.ip));
}

export function checkFavoriteResolveRateLimit(
  ip: string,
  limiter: DurableRateLimit = resolveIpLimiter,
): Promise<DurableRateLimitResult> {
  return limiter.limit(hashFavoriteIdentifier("resolve:ip", ip));
}

export function getFavoriteClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashFavoriteIdentifier(scope: "mutation:uid" | "mutation:ip" | "resolve:ip", value: string): string {
  return createHash("sha256").update(`run213:favorites:${scope}:${value}`).digest("hex");
}
