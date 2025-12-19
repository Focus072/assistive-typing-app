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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:9',message:'NextAuth handler entry',data:{method:req.method,url:req.url,pathname:url.pathname,isCallback,hasCode:!!url.searchParams.get('code'),hasError:!!url.searchParams.get('error')},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    // Unwrap params Promise for NextAuth compatibility (Next.js 16 async params)
    const params = await unwrapParams(context.params)
    // NextAuth returns a function that handles both GET and POST
    const response = await handler(req, { params })
    const responseUrl = response.headers.get('location')
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:16',message:'NextAuth handler success',data:{status:response?.status,statusText:response?.statusText,redirectUrl:responseUrl,isCallback,hasErrorInRedirect:responseUrl?.includes('error=')},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    return response
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("[NextAuth] Handler error:", error)
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/edc11742-e69a-445c-9523-36ad1186a0ce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:22',message:'NextAuth handler error caught',data:{errorMessage:error?.message,errorStack:error?.stack,errorCode:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'B'})}).catch(()=>{});
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


