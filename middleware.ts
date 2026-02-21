import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const STATIC_PREFIXES = ["/_next/", "/favicon", "/icon", "/og-image", "/logo", "/images/"]
const STATIC_SUFFIXES = [".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js"]

// Rate-limited public API paths (non-admin, non-auth)
const RATE_LIMITED_API = ["/api/announcements"]
const RATE_LIMITED_CHECKOUT = ["/api/stripe/checkout", "/api/stripe/portal"]

function isStaticPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return true
  for (const p of STATIC_PREFIXES) {
    if (pathname.startsWith(p)) return true
  }
  for (const s of STATIC_SUFFIXES) {
    if (pathname.endsWith(s)) return true
  }
  return false
}

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(lower)
}

// Build rate limiters once per cold start (edge runtime keeps them alive)
function buildLimiters() {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  const redis = new Redis({ url, token })
  return {
    api: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "10 s"), prefix: "rl:api", analytics: true }),
    checkout: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "60 s"), prefix: "rl:checkout", analytics: true }),
  }
}

const limiters = buildLimiters()

async function applyRateLimit(
  request: NextRequest,
  limiter: Ratelimit
): Promise<NextResponse | null> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"
  const { success, limit, remaining, reset } = await limiter.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    )
  }
  return null
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith("/api/auth")) return NextResponse.next()
  if (pathname === "/api/maintenance-status") return NextResponse.next()
  if (isStaticPath(pathname)) return NextResponse.next()

  // --- Rate limiting (runs before maintenance check) ---
  if (limiters) {
    try {
      if (RATE_LIMITED_CHECKOUT.some((p) => pathname.startsWith(p))) {
        const blocked = await applyRateLimit(request, limiters.checkout)
        if (blocked) return blocked
      } else if (RATE_LIMITED_API.some((p) => pathname.startsWith(p))) {
        const blocked = await applyRateLimit(request, limiters.api)
        if (blocked) return blocked
      }
    } catch {
      // Redis unavailable — fail open, don't block legitimate requests
    }
  }

  // --- Maintenance mode check ---
  let maintenance = false
  try {
    const url = new URL("/api/maintenance-status", request.nextUrl.origin)
    const res = await fetch(url, { headers: { cookie: request.headers.get("cookie") ?? "" } })
    const data = await res.json()
    maintenance = data.maintenance === true
  } catch {
    // If we can't read status, don't block
  }

  if (!maintenance) return NextResponse.next()

  if (
    pathname === "/maintenance" ||
    pathname.startsWith("/admin") ||
    pathname === "/privacy" ||
    pathname === "/terms"
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (token?.email && isAdminEmail(token.email)) return NextResponse.next()

  return NextResponse.redirect(new URL("/maintenance", request.url))
}

// Exclude static assets so maintenance page loads with CSS/images
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/auth|favicon\\.ico|icon/|logo|og-image|images/).*)",
  ],
}
