import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type DurableRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export type DurableRateLimit = {
  limit(identifier: string): Promise<DurableRateLimitResult>;
};

export class DurableRateLimitUnavailableError extends Error {
  constructor() {
    super("Durable rate limiting is unavailable.");
    this.name = "DurableRateLimitUnavailableError";
  }
}

type LimiterOptions = {
  prefix: `run213:${string}`;
  limit: number;
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`;
};

const limiters = new Map<string, Ratelimit>();

/** Creates a fail-closed Upstash limiter without exposing Redis configuration. */
export function createDurableRateLimit(options: LimiterOptions): DurableRateLimit {
  return {
    async limit(identifier: string): Promise<DurableRateLimitResult> {
      try {
        const limiter = getLimiter(options);
        const result = await limiter.limit(identifier);
        return {
          allowed: result.success,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        };
      } catch {
        // Checkout callers deliberately fail closed; never substitute process-local state.
        throw new DurableRateLimitUnavailableError();
      }
    },
  };
}

function getLimiter(options: LimiterOptions): Ratelimit {
  const cacheKey = `${options.prefix}:${options.limit}:${options.window}`;
  const cached = limiters.get(cacheKey);
  if (cached) return cached;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new DurableRateLimitUnavailableError();
  }

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(options.limit, options.window),
    prefix: options.prefix,
    analytics: false,
  });
  limiters.set(cacheKey, limiter);
  return limiter;
}
