"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginPageInner() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Redirect to dashboard if already authenticated (check this first)
  useEffect(() => {
    if (status === "authenticated" && session) {
      const callbackUrl = searchParams.get("callbackUrl")
      const cleanCallbackUrl = callbackUrl?.split("&error=")[0].split("?error=")[0]
      const targetUrl = cleanCallbackUrl?.startsWith("/") ? cleanCallbackUrl : "/dashboard"
      router.replace(targetUrl)
      return
    }
    
    if (status === "unauthenticated") {
      const errorParam = searchParams.get("error")
      if (errorParam === "OAuthCallback") {
        setError("Google sign-in failed. Please try again.")
      }
    }
  }, [status, session, searchParams, router])

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch (err) {
      setError("Failed to sign in with Google. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black shadow-sm mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-black">Welcome to TypeFlow</h1>
          <p className="text-gray-600 mt-2">Sign in with Google to get started</p>
        </div>
        
        {/* Card */}
        <div className="bg-white border border-black rounded-xl p-8 shadow-md">
          <div className="space-y-6">
            {/* Info message */}
            <div className="px-4 py-3 rounded-lg bg-gray-100 border border-black">
              <p className="text-sm text-black text-center">
                Sign in with Google to access Google Docs and start typing
              </p>
            </div>
            
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-800 text-red-900 text-sm" role="alert">
                {error}
              </div>
            )}
            
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-lg bg-black text-white font-semibold shadow-sm hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 rounded-full animate-spin border-t-white" />
                  Signing in...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
            
            <p className="text-center text-xs text-gray-600">
              By signing in, you grant TypeFlow access to your Google Docs to enable automated typing
            </p>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/50 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 rounded-full animate-spin border-t-violet-500" />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  )
}
