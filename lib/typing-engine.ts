import { chooseBatchSize, createTypingBatch, MIN_INTERVAL_MS, TypingBatch } from "./batching"
import { buildDelayPlan, computeBaseCharDelayMs } from "./typing-delays"
import { validateEngineSignature } from "./typing-engine-validation"
import type { TypingProfile } from "@/types"

const VALID_PROFILES: TypingProfile[] = ["steady", "fatigue", "burst", "micropause", "typing-test"]
const MIN_WPM = 1
const MAX_WPM = 300

/**
 * Validate engine inputs before building batch plan.
 * Throws descriptive errors for invalid combinations.
 */
export function validateEngineInputs(
  profile: TypingProfile,
  testWPM?: number
): { valid: boolean; error?: string } {
  // Verify profile is valid
  if (!VALID_PROFILES.includes(profile)) {
    return {
      valid: false,
      error: `Invalid typing profile: ${profile}. Valid profiles: ${VALID_PROFILES.join(", ")}`,
    }
  }

  // Verify testWPM is provided when profile is typing-test
  if (profile === "typing-test" && testWPM === undefined) {
    return {
      valid: false,
      error: "testWPM is required when typingProfile is 'typing-test'",
    }
  }

  // Verify testWPM is in valid range
  if (testWPM !== undefined) {
    if (testWPM < MIN_WPM || testWPM > MAX_WPM) {
      return {
        valid: false,
        error: `testWPM must be between ${MIN_WPM} and ${MAX_WPM}, got ${testWPM}`,
      }
    }
  }

  // Warn if testWPM is provided for non-typing-test profile (but don't fail)
  if (profile !== "typing-test" && testWPM !== undefined) {
    console.warn(`testWPM (${testWPM}) provided for non-typing-test profile (${profile}), ignoring`)
  }

  return { valid: true }
}

export interface MistakePlan {
  hasMistake: boolean
  deleteCount: number
}

export interface BatchPlan {
  batch: TypingBatch | null
  totalDelayMs: number
  perCharDelays: number[]
  batchPauseMs: number
  mistakePlan: MistakePlan
}

// Chance for a typo/backspace
const MISTAKE_CHANCE = 0.05 // 5%

export function planMistake(batchText: string): MistakePlan {
  if (batchText.length < 2) return { hasMistake: false, deleteCount: 0 }
  if (Math.random() > MISTAKE_CHANCE) return { hasMistake: false, deleteCount: 0 }
  // delete 1 char near end
  return { hasMistake: true, deleteCount: 1 }
}

/**
 * Build the next batch plan: slice text, compute delays, pauses, mistakes.
 */
export function buildBatchPlan(
  fullText: string,
  currentIndex: number,
  totalChars: number,
  durationMinutes: number,
  profile: TypingProfile,
  testWPM?: number // WPM from typing test
): BatchPlan {
  // Validate engine inputs
  const validation = validateEngineInputs(profile, testWPM)
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid engine inputs")
  }

  const batch = createTypingBatch(fullText, currentIndex, chooseBatchSize())
  if (!batch) {
    return {
      batch: null,
      totalDelayMs: 0,
      perCharDelays: [],
      batchPauseMs: 0,
      mistakePlan: { hasMistake: false, deleteCount: 0 },
    }
  }

  const baseCharDelay = computeBaseCharDelayMs(totalChars, durationMinutes)
  const progress = currentIndex / Math.max(1, totalChars)

  const { charDelays, batchPauseMs } = buildDelayPlan(
    batch.text,
    baseCharDelay,
    profile,
    progress,
    testWPM
  )

  // Runtime validation: verify engine signature matches profile
  // (buildDelayPlan already calls enforceMinimumDelays and applyContextPauses internally)
  if (process.env.NODE_ENV === "development") {
    const validation = validateEngineSignature(
      { charDelays, batchPauseMs },
      profile,
      progress
    )
    if (!validation.valid) {
      console.warn("Engine signature validation failed:", validation.errors)
    }
    if (validation.warnings.length > 0) {
      console.warn("Engine signature warnings:", validation.warnings)
    }
  }

  // Total delay = sum per-char + batch pause, but enforce minimum interval
  // Note: buildDelayPlan already enforces minimums, but we recalculate total here
  const perCharSum = charDelays.reduce((a, b) => a + b, 0)
  const totalDelayMs = Math.max(MIN_INTERVAL_MS, perCharSum + batchPauseMs)

  const mistakePlan = planMistake(batch.text)

  return {
    batch,
    totalDelayMs: Math.round(totalDelayMs),
    perCharDelays: charDelays,
    batchPauseMs,
    mistakePlan,
  }
}
