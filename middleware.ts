import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const STATIC_PREFIXES = ["/_next/", "/favicon", "/icon", "/og-image", "/logo", "/images/"]
const STATIC_SUFFIXES = [".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js"]

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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }
  if (pathname === "/api/maintenance-status") {
    return NextResponse.next()
  }
  if (isStaticPath(pathname)) {
    return NextResponse.next()
  }

  let maintenance = false
  try {
    const url = new URL("/api/maintenance-status", request.nextUrl.origin)
    const res = await fetch(url, { headers: { cookie: request.headers.get("cookie") ?? "" } })
    const data = await res.json()
    maintenance = data.maintenance === true
  } catch {
    // If we can't read status, don't block
  }

  if (!maintenance) {
    return NextResponse.next()
  }

  if (pathname === "/maintenance" || pathname.startsWith("/admin") || pathname === "/privacy" || pathname === "/terms") {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (token?.email && isAdminEmail(token.email)) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/maintenance", request.url))
}

// Exclude static assets so maintenance page loads with CSS/images (favicon, icon, logo, og-image, images)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/auth|favicon\\.ico|icon/|logo|og-image|images/).*)",
  ],
}
