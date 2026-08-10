import "server-only";

import { createHash } from "node:crypto";
import { createDurableRateLimit, type DurableRateLimit, type DurableRateLimitResult } from "@/lib/rate-limit";

export const CHECKOUT_RATE_LIMIT_WINDOW = "1 h" as const;
export const GUEST_IP_CHECKOUT_LIMIT = 5;
export const AUTHENTICATED_IP_CHECKOUT_LIMIT = 10;
export const PHONE_CHECKOUT_LIMIT = 5;
export const AUTHENTICATED_UID_CHECKOUT_LIMIT = 10;

type CheckoutEnvironment = "production" | "preview" | "development";

const checkoutEnvironment = resolveCheckoutEnvironment(process.env.VERCEL_ENV);
const checkoutPrefix = (scope: "guest-ip" | "auth-ip" | "phone" | "uid") => `run213:${checkoutEnvironment}:checkout:${scope}` as const;

const guestIpLimiter = createDurableRateLimit({ prefix: checkoutPrefix("guest-ip"), limit: GUEST_IP_CHECKOUT_LIMIT, window: CHECKOUT_RATE_LIMIT_WINDOW });
const authenticatedIpLimiter = createDurableRateLimit({ prefix: checkoutPrefix("auth-ip"), limit: AUTHENTICATED_IP_CHECKOUT_LIMIT, window: CHECKOUT_RATE_LIMIT_WINDOW });
const phoneLimiter = createDurableRateLimit({ prefix: checkoutPrefix("phone"), limit: PHONE_CHECKOUT_LIMIT, window: CHECKOUT_RATE_LIMIT_WINDOW });
const uidLimiter = createDurableRateLimit({ prefix: checkoutPrefix("uid"), limit: AUTHENTICATED_UID_CHECKOUT_LIMIT, window: CHECKOUT_RATE_LIMIT_WINDOW });

type CheckoutLimiters = {
  guestIp: DurableRateLimit;
  authenticatedIp: DurableRateLimit;
  phone: DurableRateLimit;
  uid: DurableRateLimit;
};

type CheckoutRateLimitInput = {
  ip: string;
  normalizedPhone: string;
  authenticatedUid: string | null;
};

export type CheckoutRateLimitResult = DurableRateLimitResult;

export function resolveCheckoutEnvironment(vercelEnvironment: string | undefined): CheckoutEnvironment {
  switch (vercelEnvironment) {
    case "production":
      return "production";
    case "preview":
      return "preview";
    case "development":
    default:
      return "development";
  }
}

export async function checkCheckoutRateLimits(
  input: CheckoutRateLimitInput,
  configuredLimiters: CheckoutLimiters = {
    guestIp: guestIpLimiter,
    authenticatedIp: authenticatedIpLimiter,
    phone: phoneLimiter,
    uid: uidLimiter,
  },
): Promise<CheckoutRateLimitResult> {
  const ipResult = await (input.authenticatedUid ? configuredLimiters.authenticatedIp : configuredLimiters.guestIp)
    .limit(hashIdentifier("ip", input.ip));
  if (!ipResult.allowed) return ipResult;

  const phoneResult = await configuredLimiters.phone.limit(hashIdentifier("phone", input.normalizedPhone));
  if (!phoneResult.allowed) return phoneResult;

  if (input.authenticatedUid) {
    const uidResult = await configuredLimiters.uid.limit(hashIdentifier("uid", input.authenticatedUid));
    if (!uidResult.allowed) return uidResult;
  }

  return mostRestrictive([ipResult, phoneResult]);
}

function hashIdentifier(scope: "ip" | "phone" | "uid", value: string): string {
  return createHash("sha256").update(`run213:checkout:${scope}:${value}`).digest("hex");
}

function mostRestrictive(results: DurableRateLimitResult[]): DurableRateLimitResult {
  return results.reduce((selected, result) => result.remaining < selected.remaining ? result : selected);
}
