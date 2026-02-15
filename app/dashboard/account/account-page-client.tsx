"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useDashboardTheme } from "../theme-context"
import { useState } from "react"

type PlanTier = "FREE" | "BASIC" | "PRO" | "UNLIMITED"

const TIER_LABELS: Record<PlanTier, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PRO: "Pro",
  UNLIMITED: "Unlimited",
}

export function AccountPageClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isDark } = useDashboardTheme()
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const planTier = (session?.user as { planTier?: PlanTier })?.planTier ?? "FREE"
  const subscriptionStatus = (session?.user as { subscriptionStatus?: string })?.subscriptionStatus ?? null
  const isPaid = subscriptionStatus === "active" && planTier !== "FREE"

  const openBillingPortal = async () => {
    setPortalError(null)
    setPortalLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setPortalError(data?.error || "Failed to open billing portal")
        return
      }
      if (data?.url) {
        window.location.href = data.url
        return
      }
      setPortalError("No portal URL returned")
    } catch (e) {
      setPortalError("Something went wrong. Please try again.")
    } finally {
      setPortalLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/", redirect: true })
  }

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-current rounded-full animate-spin border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className={`text-2xl md:text-3xl font-semibold mb-1 ${isDark ? "text-white" : "text-black"}`}>
        Account
      </h1>
      <p className={`text-sm mb-8 ${isDark ? "text-white/60" : "text-black/60"}`}>
        View your plan and manage your subscription.
      </p>

      <div className={`rounded-2xl border p-6 md:p-8 space-y-6 ${
        isDark ? "bg-white/5 border-white/15" : "bg-white border-black/10"
      }`}>
        {/* Email */}
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? "text-white/50" : "text-black/50"}`}>
            Email
          </p>
          <p className={isDark ? "text-white" : "text-black"}>
            {session.user?.email ?? "—"}
          </p>
        </div>

        {/* Plan tier */}
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? "text-white/50" : "text-black/50"}`}>
            Plan
          </p>
          <p className={isDark ? "text-white" : "text-black"}>
            {TIER_LABELS[planTier as PlanTier] ?? planTier}
            {subscriptionStatus && subscriptionStatus !== "active" && (
              <span className={`ml-2 text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>
                ({subscriptionStatus})
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          {isPaid && (
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  : "bg-black/5 hover:bg-black/10 text-black border border-black/10"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {portalLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current rounded-full animate-spin border-t-transparent" />
                  Opening...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Manage subscription
                </>
              )}
            </button>
          )}

          {portalError && (
            <p className="text-sm text-red-500">{portalError}</p>
          )}

          <Link
            href="/#pricing"
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                : "bg-black/5 hover:bg-black/10 text-black border border-black/10"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {isPaid ? "Upgrade or change plan" : "View plans & subscribe"}
          </Link>

          <button
            onClick={handleSignOut}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              isDark
                ? "bg-white text-black hover:bg-white/90 border border-white/20"
                : "bg-black text-white hover:bg-black/90 border border-black/10"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </div>

      <p className={`mt-6 text-xs ${isDark ? "text-white/40" : "text-black/40"}`}>
        In the billing portal you can cancel your subscription, update your payment method, and view invoices.
      </p>
    </div>
  )
}
