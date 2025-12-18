import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  // Let client-side handle auth for dashboard
  // The layout will handle redirects
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard"],
}






