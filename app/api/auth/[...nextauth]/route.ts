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
    const isCallback = url.pathname.includes('/callback/')
    const isCredentialsCallback = url.pathname.includes('/callback/credentials')
    const isGoogleCallback = url.pathname.includes('/callback/google')
    const errorParam = url.searchParams.get('error')
    const codeParam = url.searchParams.get('code')
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:21',message:'NextAuth handler entry',data:{method:req.method,pathname:url.pathname,isCallback,isGoogleCallback,hasCode:!!codeParam,hasError:!!errorParam,errorValue:errorParam,codeValue:codeParam?.substring(0,20)},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Unwrap params Promise for NextAuth compatibility (Next.js 16 async params)
    const params = await unwrapParams(context.params)
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:30',message:'NextAuth handler: About to call NextAuth handler',data:{isGoogleCallback,hasCode:!!codeParam,hasError:!!errorParam},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // NextAuth returns a function that handles both GET and POST
    let response: Response
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:38',message:'NextAuth handler: Calling NextAuth handler',data:{isGoogleCallback,hasCode:!!codeParam,hasError:!!errorParam},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      response = await handler(req, { params })
    } catch (handlerError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:45',message:'NextAuth handler: Error during handler call',data:{errorMessage:handlerError?.message,errorCode:handlerError?.code,errorName:handlerError?.name,errorStack:handlerError?.stack?.substring(0,500),isGoogleCallback},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      throw handlerError
    }
    
    const responseUrl = response.headers.get('location')
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:52',message:'NextAuth handler: Response received',data:{status:response?.status,statusText:response?.statusText,redirectUrl:responseUrl,hasErrorInRedirect:responseUrl?.includes('error='),errorInUrl:responseUrl?.includes('error=') ? (responseUrl?.includes('?') ? new URL(responseUrl, 'http://localhost').searchParams.get('error') : null) : null},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
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
    const url = new URL(req.url)
    const isCredentialsCallback = url.pathname.includes('/callback/credentials')
    const isSessionRequest = url.pathname.endsWith('/session') || url.pathname.includes('/session')
    const isGoogleCallback = url.pathname.includes('/callback/google')

    if (process.env.NODE_ENV === "development") {
      console.error("[NextAuth] Handler error:", error)
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:88',message:'NextAuth handler: Error caught',data:{errorMessage:error?.message,errorCode:error?.code,errorName:error?.name,isGoogleCallback,errorStack:error?.stack?.substring(0,500)},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

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


