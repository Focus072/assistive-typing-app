// Suppress deprecation warnings early
import "@/lib/suppress-warnings"

import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

// Stable params unwrapping helper - forward-compatible with Next.js param handling changes
async function unwrapParams<T>(params: Promise<T> | T): Promise<T> {
  return Promise.resolve(params)
}

// Wrap handler to catch and log errors
async function handleRequest(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  try {
    const url = new URL(req.url)
    const isCredentialsCallback = url.pathname.includes('/callback/credentials')

    // Unwrap params Promise for NextAuth compatibility (Next.js 16 async params)
    const params = await unwrapParams(context.params)

    const response = await handler(req, { params })

    const responseUrl = response.headers.get('location')

    // If credentials callback returns 401, check if it's a database error
    // and allow fallback admin to proceed
    if (isCredentialsCallback && response.status === 401) {
      // Check if this might be a database-related 401 for admin fallback
      // In this case, we'll let the error propagate but log it
      console.warn("[NextAuth] Credentials callback returned 401 - this might be a database issue")
    }

    return response
  } catch (error: any) {
    const url = new URL(req.url)
    const isSessionRequest = url.pathname.endsWith('/session') || url.pathname.includes('/session')

    if (process.env.NODE_ENV === "development") {
      console.error("[NextAuth] Handler error:", error)
    }

    // Return JSON so the client never gets HTML (avoids CLIENT_FETCH_ERROR "Unexpected token '<'")
    if (isSessionRequest) {
      return NextResponse.json(
        { error: error?.message || 'Session fetch failed' },
        { status: 500 }
      )
    }
    // For any other auth API error, still return JSON so the client never receives an HTML error page
    return NextResponse.json(
      { error: error?.message || 'Auth request failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  return handleRequest(req, context)
}

export async function POST(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  return handleRequest(req, context)
}

export const dynamic = 'force-dynamic'
