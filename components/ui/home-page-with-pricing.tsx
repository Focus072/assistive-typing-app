"use client"

import React, { useRef } from "react"
import { logger } from "@/lib/logger"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { HomeNavbar } from "@/components/ui/sign-in-flow-auth"
import { CanvasRevealEffect } from "./sign-in-flow-1"
import { PricingCards } from "@/components/ui/pricing-cards"
import { cn } from "@/lib/utils"

export function HomePageWithPricing({ className }: { className?: string }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pricingSectionRef = useRef<HTMLDivElement>(null)

  const handleScrollToPricing = () => {
    pricingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleCheckout = async (tier: 'basic' | 'pro' | 'unlimited') => {
    if (status === 'loading') {
      alert('Please wait while we verify your session...')
      return
    }

    if (status === 'unauthenticated' || !session) {
      await signIn('google', { callbackUrl: '/pricing' })
      return
    }

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: tier }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          await signIn('google', { callbackUrl: '/pricing' })
          return
        }
        throw new Error(errorData.error || `Failed to create checkout session (${response.status})`)
      }

      const data = await response.json()
      const url = data?.url
      if (url && typeof url === 'string' && url.startsWith('http')) {
        window.location.assign(url)
      } else {
        alert('Checkout started but redirect URL was missing. Please set NEXTAUTH_URL in Vercel (e.g. https://typingisboring.com).')
      }
    } catch (error) {
      logger.error('Checkout error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout'
      if (!errorMessage.includes('Unauthorized')) {
        alert(errorMessage)
      }
    }
  }

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" })
  }

  const handleGoToDashboard = () => {
    router.push("/dashboard")
  }

  const isAuthenticated = status === "authenticated"

  return (
    <div className={cn("flex w-full flex-col min-h-screen bg-black relative", className)}>
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
          <CanvasRevealEffect
            animationSpeed={3}
            containerClassName="bg-black"
            colors={[[255, 255, 255]]}
            dotSize={5}
            opacities={[0.55, 0.6, 0.7, 0.8, 1]}
            reverse={false}
            showGradient={false}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.35)_0%,_transparent_55%)]" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col flex-1">
        <HomeNavbar onPricingClick={handleScrollToPricing} />

        {/* Hero Section */}
        <main className="flex flex-1 items-center justify-center px-6 pt-32 pb-16">
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12 items-start lg:items-center">
            <section className="space-y-5">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                Natural typing for Google Docs
              </span>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white/80 drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]">
                  Typing Is Boring
                </h2>
                <p className="text-sm sm:text-base text-white/60">
                  Typing Is Boring simulates human typing in Google Docs.
                </p>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white drop-shadow-[0_0_25px_rgba(0,0,0,0.8)]">
                Make long docs feel{" "}
                <span className="text-white/60">effortless.</span>
              </h1>

              <p className="text-base sm:text-lg text-white/70">
                Paste your text, pick a Google Doc, and watch it type itself
                with human-like rhythm — pauses, bursts, and everything in between.
              </p>

              <div className="flex flex-col gap-4 pt-3 sm:pt-6">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleGoToDashboard}
                    className="inline-flex items-center justify-center w-full sm:w-auto sm:max-w-[240px] rounded-full bg-white text-black font-medium py-3 px-6 text-sm hover:bg-white/90 transition-colors"
                  >
                    Open dashboard
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleScrollToPricing}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto sm:max-w-[280px] bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full py-3.5 px-8 text-sm font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5"
                  >
                    Get Started - View Plans
                  </button>
                )}

                <div className="flex flex-col gap-1.5 pt-1">
                  <p className="text-xs text-white/50">
                    We never read or store your documents.
                  </p>
                  <p className="text-xs text-white/50">
                    Uses official Google OAuth — revoke access anytime.
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs text-white/60 pt-1">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  Looks like real typing, not a copy‑paste dump.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  Your docs stay in your Google account — we only type where you point us.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  Control speed, breaks, and pacing to match how humans type.
                </li>
              </ul>
            </section>

            {/* Right: Live preview card */}
            <aside className="relative mt-12 sm:mt-8 lg:mt-0 flex flex-col items-center lg:items-start gap-3">
              <p className="text-sm font-medium text-white/70 text-center lg:text-left w-full">
                Live preview
              </p>
              <div
                className="group relative w-full max-w-sm lg:max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.9)]"
                style={{ aspectRatio: "1 / 1" }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    background: "radial-gradient(circle at top left, rgba(16,185,129,0.2), transparent 55%), radial-gradient(circle at bottom right, rgba(52,211,153,0.18), transparent 55%)",
                  }}
                />
                <div className="pointer-events-none absolute inset-px rounded-[1.1rem] bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50" />
                <div className="relative z-10 h-full p-5 sm:p-7 space-y-5 sm:space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/25 animate-ping" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.8)]" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs text-white/80">Typing into Google Docs…</span>
                        <span className="text-[11px] text-emerald-200/80">Natural pacing enabled</span>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60">
                      Live
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-white/70 font-mono leading-relaxed">
                    <p className="truncate">typingisboring is simulating human typing into your doc…</p>
                    <p className="truncate">pauses, bursts, and scroll just like a real person.</p>
                    <p className="truncate">You stay in control of speed and when to stop.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Trust Bar - Single cohesive dark pill */}
        <div className="px-6 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Urgency Badge */}
            <div className="flex justify-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 animate-ping opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                </span>
                Live access now available
              </span>
            </div>

            {/* Trust Bar */}
            <div className="flex flex-wrap items-center justify-center">
              <div className="inline-flex items-center gap-4 sm:gap-6 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Official Google OAuth</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span>Stripe Secure Payments</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Your data stays private</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div ref={pricingSectionRef} className="px-6 py-32 sm:py-40 mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white mb-3 sm:mb-4 tracking-tighter">
                Simple, transparent pricing
              </h2>
              <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Choose the perfect plan for your typing automation needs. All plans include core features.
              </p>
            </div>
            <PricingCards onCheckout={handleCheckout} highlightPlan="unlimited" />
          </div>
        </div>
      </div>
    </div>
  )
}
