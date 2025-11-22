import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter using Map
// For production, consider using Redis or a dedicated rate limiting service

type RateLimitStore = Map<string, { count: number; resetTime: number }>;

const stores: Map<string, RateLimitStore> = new Map();

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

export function createRateLimiter(config: RateLimitConfig) {
  const store: RateLimitStore = new Map();
  stores.set(JSON.stringify(config), store);

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
      if (value.resetTime < now) {
        store.delete(key);
      }
    }
  }, config.interval);

  return {
    check: async (req: NextRequest, limit: number): Promise<{ success: boolean; remaining: number }> => {
      // Get identifier (IP or user ID)
      const identifier = 
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        req.ip ||
        "anonymous";

      const now = Date.now();
      const entry = store.get(identifier);

      if (!entry || entry.resetTime < now) {
        // Create new entry
        store.set(identifier, {
          count: 1,
          resetTime: now + config.interval,
        });
        return { success: true, remaining: limit - 1 };
      }

      // Increment existing entry
      entry.count++;

      if (entry.count > limit) {
        return { success: false, remaining: 0 };
      }

      return { success: true, remaining: limit - entry.count };
    },
  };
}

// Pre-configured limiters
export const apiLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
});

export const strictLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
});

// Middleware helper
export async function withRateLimit(
  req: NextRequest,
  limit: number,
  limiter = apiLimiter
): Promise<NextResponse | null> {
  const { success, remaining } = await limiter.check(req, limit);

  if (!success) {
    return NextResponse.json(
      { 
        error: "Too many requests", 
        message: "Rate limit exceeded. Please try again later." 
      },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(Date.now() + 60000).toISOString(),
        },
      }
    );
  }

  return null; // No error, continue
}

