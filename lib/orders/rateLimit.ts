type RateLimitBucket = { count: number; resetAt: number; attempts: Set<string> };
const buckets = new Map<string, RateLimitBucket>();
export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number; retryAfterSeconds: number; idempotentAttempt: boolean };
export function checkRateLimit(key: string, limit: number, windowMs: number, attemptKey?: string | null, now = Date.now()): RateLimitResult {
  const attempt = attemptKey?.trim() || null;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: attempt ? 1 : 1, resetAt, attempts: new Set(attempt ? [attempt] : []) });
    return { allowed: true, remaining: limit - 1, resetAt, retryAfterSeconds: Math.ceil((resetAt - now) / 1000), idempotentAttempt: false };
  }
  if (attempt && current.attempts.has(attempt)) {
    return { allowed: true, remaining: Math.max(limit - current.count, 0), resetAt: current.resetAt, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000), idempotentAttempt: true };
  }
  if (current.count >= limit) return { allowed: false, remaining: 0, resetAt: current.resetAt, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000), idempotentAttempt: false };
  current.count += 1;
  if (attempt) current.attempts.add(attempt);
  return { allowed: true, remaining: Math.max(limit - current.count, 0), resetAt: current.resetAt, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000), idempotentAttempt: false };
}
