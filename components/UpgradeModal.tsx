"use client"

import { useState } from "react"
import Link from "next/link"
import { PlanTier } from "@prisma/client"

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  requiredTier: PlanTier
  feature: string
  currentTier?: PlanTier
}

const tierInfo: Record<PlanTier, { name: string; price: string; color: string }> = {
  FREE: { name: "Free", price: "$0", color: "text-gray-400" },
  BASIC: { name: "Basic", price: "$10", color: "text-blue-400" },
  PRO: { name: "Pro", price: "$10", color: "text-yellow-400" },
  UNLIMITED: { name: "Unlimited", price: "$15", color: "text-purple-400" },
  ADMIN: { name: "Admin", price: "—", color: "text-emerald-400" },
}

export function UpgradeModal({
  isOpen,
  onClose,
  requiredTier,
  feature,
  currentTier = "FREE",
}: UpgradeModalProps) {
  if (!isOpen) return null

  const requiredTierInfo = tierInfo[requiredTier]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-black/90 border border-white/20 p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Unlock {feature}
            </h2>
            <p className="text-white/70 text-sm">
              Upgrade to {requiredTierInfo.name} plan to access this feature
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-white/70 text-sm">Current Plan</span>
            <span className={`font-medium ${tierInfo[currentTier].color}`}>
              {tierInfo[currentTier].name}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-white/70 text-sm">Required Plan</span>
            <span className={`font-medium ${requiredTierInfo.color}`}>
              {requiredTierInfo.name} ({requiredTierInfo.price}/mo)
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/pricing"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors text-center"
          >
            Upgrade Now
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
