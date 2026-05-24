import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isUpstashConfigured } from "@/lib/env";

type LimiterKey = "stripe" | "ai" | "auth";

const WINDOWS = {
  stripe: { tokens: 10, window: "1 m" as const, prefix: "rl:stripe" },
  ai: { tokens: 30, window: "1 m" as const, prefix: "rl:ai" },
  auth: { tokens: 8, window: "1 m" as const, prefix: "rl:auth" },
};

let redis: Redis | null = null;
const limiters: Partial<Record<LimiterKey, Ratelimit>> = {};

function getLimiter(key: LimiterKey): Ratelimit | null {
  if (!isUpstashConfigured()) return null;
  if (limiters[key]) return limiters[key]!;

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  const cfg = WINDOWS[key];
  limiters[key] = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
    prefix: cfg.prefix,
    analytics: false,
  });
  return limiters[key]!;
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * Best-effort rate-limit check. Returns `success: true` when Upstash
 * is not configured (dev / preview fallback) — callers should still
 * inspect `success` so they can short-circuit when limits are enforced.
 *
 * Fails OPEN on transport errors: if Upstash itself is unreachable we'd
 * rather let the request through than take the whole app down. Brief
 * abuse window during an outage is preferable to a hard outage; the
 * underlying endpoints still have auth gates + webhook signature
 * verification as the real security boundary.
 */
export async function checkRateLimit(
  key: LimiterKey,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(key);
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
  try {
    return await limiter.limit(identifier);
  } catch {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}
