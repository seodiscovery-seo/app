import "server-only";

/**
 * Simple in-memory fixed-window rate limiter.
 * Fine for a single server instance. For multiple instances, replace with Redis/Upstash
 * (keep the same function signature).
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) pruneExpired(now);
    return { ok: true, retryAfterMs: 0 };
  }

  bucket.count += 1;
  if (bucket.count > max) return { ok: false, retryAfterMs: bucket.resetAt - now };
  return { ok: true, retryAfterMs: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

function pruneExpired(now: number) {
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}
