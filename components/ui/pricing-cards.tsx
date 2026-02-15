"use client"

import React from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Clock, History, Shield, Zap, CheckCircle2, Loader2 } from "lucide-react"

interface PricingCardsProps {
  onCheckout?: (tier: 'basic' | 'pro' | 'unlimited') => void
  highlightPlan?: 'basic' | 'pro' | 'unlimited'
}

export function PricingCards({ onCheckout, highlightPlan = 'unlimited' }: PricingCardsProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState<'basic' | 'pro' | 'unlimited' | null>(null)

  const handleCheckout = async (tier: 'basic' | 'pro' | 'unlimited') => {
    // Prevent multiple clicks
    if (isLoading !== null) {
      return
    }

    if (onCheckout) {
      onCheckout(tier)
      return
    }

    // Check loading state first
    if (status === 'loading') {
      alert('Please wait while we verify your session...')
      return
    }

    // Require authentication before checkout
    if (status === 'unauthenticated' || !session) {
      // Direct Google OAuth sign-in, then redirect to Stripe checkout for this tier
      setIsLoading(tier)
      await signIn('google', { callbackUrl: `/api/stripe/checkout?priceId=${tier}` })
      return
    }

    // If user is logged in and already has active subscription, send them to dashboard
    if ((session.user as any).subscriptionStatus === 'active') {
      router.push('/dashboard')
      return
    }

    // Authenticated users without active subscription go directly to Stripe checkout
    setIsLoading(tier)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId: tier }),
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        if (response.status === 401) {
          // Keep loading state, will redirect to OAuth
          await signIn('google', { callbackUrl: '/pricing' })
          return
        }
        
        setIsLoading(null)
        throw new Error(errorData.error || errorData.message || `Failed to create checkout session (${response.status})`)
      }

      const data = await response.json()
      const url = data?.url
      if (url && typeof url === 'string' && url.startsWith('http')) {
        window.location.assign(url)
      } else {
        setIsLoading(null)
        alert('Checkout started but redirect URL was missing. Please set NEXTAUTH_URL in Vercel (e.g. https://typingisboring.com).')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout'
      
      if (!errorMessage.includes('Unauthorized')) {
        alert(errorMessage)
      }
      setIsLoading(null)
    }
  }

  const isHighlighted = (plan: 'basic' | 'pro' | 'unlimited') => highlightPlan === plan

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-10 items-stretch px-4 sm:px-0">
      {/* Basic Plan */}
      <div className={`relative backdrop-blur-xl bg-black/60 border ${isHighlighted('basic') ? 'border-2 border-red-500/50 md:scale-105 md:-mt-4 md:mb-4' : 'border-white/20'} rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {isHighlighted('basic') && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
            <span className="bg-red-600 text-white text-xs font-medium px-4 py-1 rounded-full">
              Most Popular
            </span>
          </div>
        )}
        <div className="relative z-10">
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-white mb-2">Basic</h3>
            <p className="text-white/60 text-sm">Perfect for getting started</p>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold text-white">$10</span>
              <span className="text-sm text-white/50">/month</span>
            </div>
          </div>
          <ul className="space-y-3.5 mb-8">
            <li className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Up to 3 hours typing duration</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Basic typing profiles (Steady, Fatigue)</span>
            </li>
            <li className="flex items-start gap-3">
              <History className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Job history (last 20 jobs)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Real-time progress tracking</span>
            </li>
            <li className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Pause, resume, and stop controls</span>
            </li>
          </ul>
          <div className="mt-auto pt-4">
            <button
              onClick={() => handleCheckout('basic')}
              disabled={isLoading === 'basic' || isLoading !== null}
              className="w-full px-6 py-3.5 rounded-xl transition-all font-semibold bg-gray-800/80 border border-gray-700/50 text-white hover:bg-gray-700/80 hover:border-gray-600/50 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading === 'basic' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                status === 'unauthenticated' || !session ? 'Sign in to Purchase' : 'Get Started'
              )}
            </button>
          </div>
        </div>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
      </div>

      {/* Pro Plan */}
      <div className={`relative backdrop-blur-xl bg-black/60 border ${isHighlighted('pro') ? 'border-2 border-red-500/50 md:scale-105 md:-mt-4 md:mb-4' : 'border-white/20'} rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {isHighlighted('pro') && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
            <span className="bg-red-600 text-white text-xs font-medium px-4 py-1 rounded-full">
              Most Popular
            </span>
          </div>
        )}
        <div className="relative z-10">
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-white mb-2">Pro</h3>
            <p className="text-white/60 text-sm">For power users</p>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold text-white">$10</span>
              <span className="text-sm text-white/50">/month</span>
            </div>
          </div>
          <ul className="space-y-3.5 mb-8">
            <li className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Up to 6 hours typing duration</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">All typing profiles (Steady, Fatigue, Burst, Micro-pause)</span>
            </li>
            <li className="flex items-start gap-3">
              <History className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Extended job history (last 100 jobs)</span>
            </li>
            <li className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Priority support</span>
            </li>
          </ul>
          <div className="mt-auto pt-4">
            <button
              onClick={() => handleCheckout('pro')}
              disabled={isLoading === 'pro' || isLoading !== null}
              className="w-full px-6 py-3.5 rounded-xl transition-all font-semibold bg-gray-800/80 border border-gray-700/50 text-white hover:bg-gray-700/80 hover:border-gray-600/50 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading === 'pro' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                status === 'unauthenticated' || !session ? 'Sign in to Purchase' : 'Get Started'
              )}
            </button>
          </div>
        </div>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
      </div>

      {/* Unlimited Plan - Highlighted */}
      <div className={`relative backdrop-blur-xl bg-black/60 border ${isHighlighted('unlimited') ? 'border-2 border-red-500/50 md:scale-105 md:-mt-4 md:mb-4' : 'border-white/20'} rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`} style={isHighlighted('unlimited') ? { boxShadow: '0 0 20px rgba(220, 38, 38, 0.15)' } : undefined}>
        {/* Glow effect for highlighted plan */}
        {isHighlighted('unlimited') && (
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-red-500/20 via-red-500/10 to-red-500/20 blur-xl opacity-50 pointer-events-none" />
        )}
        <div className={`absolute inset-0 rounded-3xl ${isHighlighted('unlimited') ? 'bg-gradient-to-br from-red-500/10 to-transparent' : 'bg-gradient-to-br from-white/5 to-transparent'} pointer-events-none`} />
        {isHighlighted('unlimited') && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
            <span className="bg-gradient-to-r from-red-600 to-red-700 text-white text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg shadow-red-500/50">
              Most Popular
            </span>
          </div>
        )}
        <div className="relative z-10">
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-white mb-2">Unlimited</h3>
            <p className="text-white/60 text-sm">For teams and organizations</p>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold text-white">$15</span>
              <span className="text-sm text-white/50">/month</span>
            </div>
          </div>
          <ul className="space-y-3.5 mb-8">
            <li className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Unlimited typing duration</span>
            </li>
            <li className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">All typing profiles (Steady, Fatigue, Burst, Micro-pause)</span>
            </li>
            <li className="flex items-start gap-3">
              <History className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Unlimited job history</span>
            </li>
            <li className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Advanced features & API access</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-white/70 leading-relaxed">Priority support & team collaboration</span>
            </li>
          </ul>
          <div className="mt-auto pt-4">
            <button
              onClick={() => handleCheckout('unlimited')}
              disabled={isLoading === 'unlimited' || isLoading !== null}
              className="w-full px-6 py-3.5 rounded-xl transition-all font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading === 'unlimited' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                status === 'unauthenticated' || !session ? 'Sign in to Purchase' : 'Get Started'
              )}
            </button>
          </div>
        </div>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
      </div>
    </div>
  )
}
