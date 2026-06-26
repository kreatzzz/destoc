import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { AppError } from "@/lib/errors";
import { getServerEnv, hasUpstashConfiguration } from "@/lib/env";
import type { RateLimitResult } from "@/lib/types";

export const RATE_LIMIT_POLICIES = {
  auth: { limit: 8, window: "10 m" },
  mutation: { limit: 30, window: "1 m" },
  review: { limit: 6, window: "10 m" },
  sandbox: { limit: 10, window: "10 m" },
} as const;

export type RateLimitPolicy = keyof typeof RATE_LIMIT_POLICIES;

type MemoryBucket = { count: number; reset: number };
const memoryBuckets = new Map<string, MemoryBucket>();
const upstashLimiters = new Map<RateLimitPolicy, Ratelimit>();

function getUpstashLimiter(policy: RateLimitPolicy): Ratelimit | undefined {
  const env = getServerEnv();
  if (!hasUpstashConfiguration(env)) return undefined;

  const cached = upstashLimiters.get(policy);
  if (cached) return cached;

  const definition = RATE_LIMIT_POLICIES[policy];
  const limiter = new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    }),
    limiter: Ratelimit.slidingWindow(definition.limit, definition.window),
    prefix: `destoc:${policy}`,
    ephemeralCache: new Map(),
  });

  upstashLimiters.set(policy, limiter);
  return limiter;
}

function limitInMemory(policy: RateLimitPolicy, identifier: string): RateLimitResult {
  const definition = RATE_LIMIT_POLICIES[policy];
  const now = Date.now();
  const windowMs = policy === "mutation" ? 60_000 : 10 * 60_000;
  const key = `${policy}:${identifier}`;
  const previous = memoryBuckets.get(key);
  const bucket = !previous || previous.reset <= now
    ? { count: 0, reset: now + windowMs }
    : previous;

  bucket.count += 1;
  memoryBuckets.set(key, bucket);

  return {
    success: bucket.count <= definition.limit,
    limit: definition.limit,
    remaining: Math.max(0, definition.limit - bucket.count),
    reset: bucket.reset,
  };
}

export async function checkRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<RateLimitResult> {
  if (!identifier) {
    throw new AppError("VALIDATION_ERROR", "A rate-limit identifier is required.");
  }

  const limiter = getUpstashLimiter(policy);
  if (limiter) {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  if (getServerEnv().NODE_ENV === "production" && !getServerEnv().ALLOW_IN_MEMORY_RATE_LIMIT) {
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Upstash Redis is required for rate limiting in production unless ALLOW_IN_MEMORY_RATE_LIMIT is explicitly enabled.",
    );
  }

  return limitInMemory(policy, identifier);
}

export async function enforceRateLimit(policy: RateLimitPolicy, identifier: string): Promise<void> {
  const result = await checkRateLimit(policy, identifier);
  if (!result.success) {
    throw new AppError("RATE_LIMITED", "Too many requests. Try again after the rate limit resets.");
  }
}
