import "server-only";

import { createHash } from "node:crypto";
import { createDurableRateLimit, type DurableRateLimit, type DurableRateLimitResult } from "@/lib/rate-limit";

export const WISHLIST_IP_LIMIT = 10;
export const WISHLIST_IP_WINDOW = "1 h" as const;
export const WISHLIST_EMAIL_LIMIT = 3;
export const WISHLIST_EMAIL_WINDOW = "24 h" as const;

type WishlistEnvironment = "production" | "preview" | "development";
type WishlistLimiters = { ip: DurableRateLimit; email: DurableRateLimit };

const environment = resolveWishlistEnvironment(process.env.VERCEL_ENV);
const prefix = (scope: "ip" | "email") => `run213:${environment}:wishlist:${scope}` as const;
const ipLimiter = createDurableRateLimit({ prefix: prefix("ip"), limit: WISHLIST_IP_LIMIT, window: WISHLIST_IP_WINDOW });
const emailLimiter = createDurableRateLimit({ prefix: prefix("email"), limit: WISHLIST_EMAIL_LIMIT, window: WISHLIST_EMAIL_WINDOW });

export function resolveWishlistEnvironment(value: string | undefined): WishlistEnvironment {
  return value === "production" || value === "preview" ? value : "development";
}

export async function checkWishlistRateLimits(
  input: { ip: string; normalizedEmail: string },
  limiters: WishlistLimiters = { ip: ipLimiter, email: emailLimiter },
): Promise<DurableRateLimitResult> {
  const ipResult = await limiters.ip.limit(hashIdentifier("ip", input.ip));
  if (!ipResult.allowed) return ipResult;
  return limiters.email.limit(hashIdentifier("email", input.normalizedEmail));
}

function hashIdentifier(scope: "ip" | "email", value: string): string {
  return createHash("sha256").update(`run213:wishlist:${scope}:${value}`).digest("hex");
}
