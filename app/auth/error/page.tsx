"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function AuthErrorPageInner() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  let errorMessage = "Something went wrong during sign-in."
  let errorDetails = "Please try again, or choose a different account."

  if (error === "OAuthCallback") {
    errorMessage = "Google sign-in was cancelled or failed."
    errorDetails = "You can try signing in again, or choose a different Google account."
  } else if (error === "AccessDenied") {
    errorMessage = "Access denied."
    errorDetails = "Please grant the required permissions to use typingisboring."
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,1)_0%,_transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6 rounded-xl border border-white/10 bg-[#111] p-8 shadow-lg">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Authentication Error</h1>
          <p className="text-sm text-white/70">{errorMessage}</p>
          <p className="text-sm text-white/60 mt-2">{errorDetails}</p>
        </div>

        <div className="space-y-3 rounded-lg bg-white/5 border border-white/10 p-4">
          <p className="text-sm font-medium text-white">Common causes:</p>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <span className="text-white/50">•</span>
              <span>Consent screen was closed or cancelled</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/50">•</span>
              <span>Session expired — please try again</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/50">•</span>
              <span>Required permissions were not granted</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
          >
            Try again
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 rounded-full animate-spin border-t-white" />
        </div>
      }
    >
      <AuthErrorPageInner />
    </Suspense>
  )
}




