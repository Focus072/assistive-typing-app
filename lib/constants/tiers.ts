import { PlanTier } from '@prisma/client'

// Re-export PlanTier for convenience
export type { PlanTier }

export interface TierLimits {
  maxDurationMinutes: number | null // null = unlimited
  maxJobsPerDay: number | null
  maxJobHistory: number | null
  allowedProfiles: string[] // TypingProfile values
}

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  FREE: {
    maxDurationMinutes: 60, // 1 hour
    maxJobsPerDay: 5,
    maxJobHistory: 10,
    allowedProfiles: ['steady', 'fatigue'],
  },
  BASIC: {
    maxDurationMinutes: 180, // 3 hours
    maxJobsPerDay: 20,
    maxJobHistory: 20,
    allowedProfiles: ['steady', 'fatigue'],
  },
  PRO: {
    maxDurationMinutes: 360, // 6 hours
    maxJobsPerDay: 50,
    maxJobHistory: 100,
    allowedProfiles: ['steady', 'fatigue', 'burst', 'micropause', 'typing-test'],
  },
  UNLIMITED: {
    maxDurationMinutes: null, // unlimited
    maxJobsPerDay: null,
    maxJobHistory: null,
    allowedProfiles: ['steady', 'fatigue', 'burst', 'micropause', 'typing-test'],
  },
}

export function getUserLimits(tier: PlanTier): TierLimits {
  return TIER_LIMITS[tier]
}

export function isProfileAllowed(tier: PlanTier, profile: string): boolean {
  const limits = getUserLimits(tier)
  return limits.allowedProfiles.includes(profile)
}

export function getMaxDuration(tier: PlanTier): number | null {
  return getUserLimits(tier).maxDurationMinutes
}

export function getMaxJobsPerDay(tier: PlanTier): number | null {
  return getUserLimits(tier).maxJobsPerDay
}

export function getMaxJobHistory(tier: PlanTier): number | null {
  return getUserLimits(tier).maxJobHistory
}
