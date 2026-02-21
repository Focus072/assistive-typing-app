import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Lazily create the rate limiter only when KV env vars are present.
// Falls back to null so callers can skip limiting gracefully if Redis isn't configured.
function createRatelimit() {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null

  const redis = new Redis({ url, token })

  return {
    // Public API endpoints — 30 requests per 10 seconds per IP
    api: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "10 s"),
      prefix: "rl:api",
      analytics: true,
    }),
    // Checkout — 5 requests per minute per IP (prevent abuse)
    checkout: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "rl:checkout",
      analytics: true,
    }),
  }
}

export const ratelimiters = createRatelimit()
