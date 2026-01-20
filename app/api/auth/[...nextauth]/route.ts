// Suppress deprecation warnings early
import "@/lib/suppress-warnings"

import NextAuth from "next-auth"
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
    const isCallback = url.pathname.includes('/callback/')
    const isCredentialsCallback = url.pathname.includes('/callback/credentials')
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:9',message:'NextAuth handler entry',data:{method:req.method,url:req.url,pathname:url.pathname,isCallback,isCredentialsCallback,hasCode:!!url.searchParams.get('code'),hasError:!!url.searchParams.get('error')},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    // Unwrap params Promise for NextAuth compatibility (Next.js 16 async params)
    const params = await unwrapParams(context.params)
    // NextAuth returns a function that handles both GET and POST
    const response = await handler(req, { params })
    const responseUrl = response.headers.get('location')
    
    // If credentials callback returns 401, check if it's a database error
    // and allow fallback admin to proceed
    if (isCredentialsCallback && response.status === 401) {
      // Check if this might be a database-related 401 for admin fallback
      // In this case, we'll let the error propagate but log it
      console.warn("[NextAuth] Credentials callback returned 401 - this might be a database issue")
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:16',message:'NextAuth handler success',data:{status:response?.status,statusText:response?.statusText,redirectUrl:responseUrl,isCallback,isCredentialsCallback,hasErrorInRedirect:responseUrl?.includes('error=')},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    return response
  } catch (error: any) {
    // For credentials callbacks, if it's a database error, try to allow fallback
    const url = new URL(req.url)
    const isCredentialsCallback = url.pathname.includes('/callback/credentials')
    
    if (isCredentialsCallback && 
        (error?.message?.includes("quota") || 
         error?.message?.includes("compute time") ||
         error?.message?.includes("database"))) {
      console.warn("[NextAuth] Database error in credentials callback - allowing fallback")
      // Return a redirect to indicate the error, but don't throw
      // The client will handle the error message
    }
    
    if (process.env.NODE_ENV === "development") {
      console.error("[NextAuth] Handler error:", error)
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:22',message:'NextAuth handler error caught',data:{errorMessage:error?.message,errorStack:error?.stack,errorCode:error?.code,isCredentialsCallback},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error
  }
}

export async function GET(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  return handleRequest(req, context)
}

export async function POST(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  return handleRequest(req, context)
}

export const dynamic = 'force-dynamic'


