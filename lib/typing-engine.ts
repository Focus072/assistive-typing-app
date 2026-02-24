import { chooseBatchSize, createTypingBatch, MIN_INTERVAL_MS, TypingBatch } from "./batching"
import { logger } from "@/lib/logger"
import { buildDelayPlan, computeBaseCharDelayMs } from "./typing-delays"
import { validateEngineSignature } from "./typing-engine-validation"
import { createPRNG, generateSeed, nextRandom } from "./prng"
import {
  createTemporalState,
  createWPMState,
  updateTemporalState,
  updateWPMState,
  type EngineState,
} from "./typing-state"
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
    logger.warn(`testWPM (${testWPM}) provided for non-typing-test profile (${profile}), ignoring`)
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
  engineState: EngineState
}

// Chance for a typo/backspace
const MISTAKE_CHANCE = 0.05 // 5%

export interface BuildBatchPlanOptions {
  jobId?: string
  engineState?: EngineState
}

function cloneEngineState(state?: EngineState): EngineState | undefined {
  if (!state) return undefined
  return {
    randomState: { ...state.randomState },
    temporalState: { ...state.temporalState },
    wpmState: state.wpmState ? { ...state.wpmState } : undefined,
    burstState: state.burstState ? { ...state.burstState } : undefined,
    lastBatchSize: state.lastBatchSize,
  }
}

export function planMistake(
  batchText: string,
  randomFn: () => number = () => Math.random()
): MistakePlan {
  if (batchText.length < 2) return { hasMistake: false, deleteCount: 0 }
  if (randomFn() > MISTAKE_CHANCE) return { hasMistake: false, deleteCount: 0 }
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
  testWPM?: number, // WPM from typing test
  options?: BuildBatchPlanOptions
): BatchPlan {
  // Validate engine inputs
  const validation = validateEngineInputs(profile, testWPM)
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid engine inputs")
  }

  const existingState = cloneEngineState(options?.engineState)
  const randomState = existingState?.randomState ?? createPRNG(generateSeed(options?.jobId ?? "typing-engine"))
  const temporalState = existingState?.temporalState ?? createTemporalState()
  const wpmState = profile === "typing-test" ? (existingState?.wpmState ?? createWPMState()) : undefined
  const randomFn = () => nextRandom(randomState)

  const batchSize = chooseBatchSize(existingState?.lastBatchSize, randomFn)
  const batch = createTypingBatch(fullText, currentIndex, batchSize)
  if (!batch) {
    const emptyEngineState: EngineState = {
      randomState,
      temporalState,
      lastBatchSize: existingState?.lastBatchSize,
    }
    if (wpmState) {
      emptyEngineState.wpmState = wpmState
    }
    if (existingState?.burstState) {
      emptyEngineState.burstState = existingState.burstState
    }
    return {
      batch: null,
      totalDelayMs: 0,
      perCharDelays: [],
      batchPauseMs: 0,
      mistakePlan: { hasMistake: false, deleteCount: 0 },
      engineState: emptyEngineState,
    }
  }

  const baseCharDelay = computeBaseCharDelayMs(totalChars, durationMinutes)
  const progress = currentIndex / Math.max(1, totalChars)

  const { charDelays, batchPauseMs, burstState: nextBurstState } = buildDelayPlan(
    batch.text,
    baseCharDelay,
    profile,
    progress,
    testWPM,
    randomState,
    temporalState,
    wpmState,
    existingState?.burstState
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
      logger.warn("Engine signature validation failed:", validation.errors)
    }
    if (validation.warnings.length > 0) {
      logger.warn("Engine signature warnings:", validation.warnings)
    }
  }

  // Total delay = sum per-char + batch pause, but enforce minimum interval
  // Note: buildDelayPlan already enforces minimums, but we recalculate total here
  const perCharSum = charDelays.reduce((a, b) => a + b, 0)
  const totalDelayMs = Math.round(Math.max(MIN_INTERVAL_MS, perCharSum + batchPauseMs))

  const mistakePlan = planMistake(batch.text, randomFn)
  const averageDelay = charDelays.length > 0 ? perCharSum / charDelays.length : 0
  const nextTemporalState = updateTemporalState(temporalState, averageDelay)
  const nextWPMState = profile === "typing-test" && wpmState && testWPM !== undefined
    ? updateWPMState(wpmState, totalDelayMs, batch.text.length, testWPM)
    : undefined

  const engineState: EngineState = {
    randomState,
    temporalState: nextTemporalState,
    lastBatchSize: batch.text.length,
  }
  if (nextWPMState) {
    engineState.wpmState = nextWPMState
  }
  if (nextBurstState) {
    engineState.burstState = nextBurstState
  }

  return {
    batch,
    totalDelayMs,
    perCharDelays: charDelays,
    batchPauseMs,
    mistakePlan,
    engineState,
  }
}
