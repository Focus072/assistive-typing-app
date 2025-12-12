"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

export function LandingPage() {
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch (err) {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black leading-tight">
            Turn any text into natural human typing in Google Docs.
          </h1>
          <p className="text-xl md:text-2xl text-black/80 max-w-2xl mx-auto">
            Realistic pacing. No copy-paste. Looks like you typed it.
          </p>
          <div className="pt-8 space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-3 mx-auto"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 rounded-full animate-spin border-t-white" />
                  Signing in...
                </>
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
            <p className="text-sm text-black/60">
              Takes ~10 seconds · Free to start
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 border-t border-black/10">
        <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-black rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg text-black font-medium">Paste text</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-black rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <p className="text-lg text-black font-medium">Choose typing style + speed</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-black rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg text-black font-medium">Watch it type in Google Docs</p>
          </div>
        </div>
      </section>

      {/* Why This Exists */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 border-t border-black/10">
        <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-12">
          Why This Exists
        </h2>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-black mt-2 flex-shrink-0" />
            <p className="text-lg text-black">Types with human pauses and variation</p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-black mt-2 flex-shrink-0" />
            <p className="text-lg text-black">No copy/paste history</p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-black mt-2 flex-shrink-0" />
            <p className="text-lg text-black">Uses your own Google account</p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-black mt-2 flex-shrink-0" />
            <p className="text-lg text-black">Per-document safety lock (no duplicates)</p>
          </div>
        </div>
      </section>

      {/* Live Preview */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 border-t border-black/10">
        <div className="space-y-6">
          <div className="aspect-video bg-gray-100 border-2 border-black/20 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <svg className="w-16 h-16 mx-auto text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-black/60">Video/GIF placeholder</p>
            </div>
          </div>
          <p className="text-center text-lg text-black/80">
            This is what professors, editors, and Docs see.
          </p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 border-t border-black/10">
        <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-12">
          Use Cases
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="text-center">
            <p className="text-lg text-black">Essays & assignments</p>
          </div>
          <div className="text-center">
            <p className="text-lg text-black">Drafting long docs</p>
          </div>
          <div className="text-center">
            <p className="text-lg text-black">Re-typing handwritten notes</p>
          </div>
          <div className="text-center">
            <p className="text-lg text-black">Accessibility / fatigue support</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 border-t border-black/10">
        <div className="text-center space-y-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-3 mx-auto"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 rounded-full animate-spin border-t-white" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google → Start typing
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  )
}

