import type { TypingProfile } from "@/types"
import { logger } from "@/lib/logger"
import {
  getProfileRange,
  applyContextPauses,
  enforceMinimumDelays,
  validateDelayPlan,
  randomInt as coreRandomInt,
  computeBaseCharDelayMs,
  clampWPMRange,
} from "./typing-engine-core"
import type { RandomState } from "./prng"
import { nextRandom, randomInt as prngRandomInt } from "./prng"
import type { TemporalState, WPMState } from "./typing-state"

export interface DelayPlan {
  charDelays: number[] // per-character delays
  batchPauseMs: number // extra pause after batch (punctuation/micro-pause)
}

export interface TypingTestConfig {
  wpm: number // Words per minute from typing test
}

// Re-export for backward compatibility
export { computeBaseCharDelayMs }

/**
 * Generate skewed/clustered noise for delay jitter.
 * Uses log-normal distribution to cluster delays around typical values with occasional outliers.
 * This creates human-like distribution (not uniform).
 */
function skewedJitter(baseDelay: number, skewFactor: number, randomFn: () => number): number {
  // Use Box-Muller transform to generate normal distribution
  const u1 = randomFn()
  const u2 = randomFn()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  
  // Transform to log-normal (skewed distribution)
  // Most values cluster around baseDelay, some faster, fewer slower
  const logMean = Math.log(baseDelay)
  const logStd = skewFactor * 0.2 // Adjust spread based on skew factor
  const logNormal = Math.exp(logMean + logStd * z0)
  
  // Clamp to reasonable bounds (50% to 150% of base)
  return Math.max(baseDelay * 0.5, Math.min(baseDelay * 1.5, logNormal))
}

/**
 * Apply profile-specific delay adjustment with skewed noise.
 * Each engine has its own personality.
 */
function profileAdjustedDelay(
  baseDelay: number,
  profile: TypingProfile,
  progress: number,
  randomFn: () => number,
  temporalDrift: number = 0 // Temporal drift factor from EMA
): number {
  // Apply temporal drift (low-frequency, smoothed)
  const driftAdjustedDelay = baseDelay * (1 + temporalDrift)
  
  // Use skewed jitter instead of uniform random
  const skewFactor = profile === "steady" ? 0.1 : 0.15 // Steady has less skew
  const jitteredDelay = skewedJitter(driftAdjustedDelay, skewFactor, randomFn)
  
  // Apply profile-specific multiplier
  switch (profile) {
    case "steady":
      return jitteredDelay * (0.95 + randomFn() * 0.1) // low variance
    case "fatigue": {
      // Non-linear progress curve (not linear)
      const fatigueProgress = Math.pow(progress, 1.1)
      const fatigue = 1 + fatigueProgress * (0.15 * (1 + randomFn() * 0.3)) // 5–15%+ as progress grows
      return jitteredDelay * fatigue * (0.95 + randomFn() * 0.1)
    }
    case "burst": {
      // bursts: faster chars but occasional long pause handled elsewhere
      return jitteredDelay * (0.7 + randomFn() * 0.2)
    }
    case "micropause":
      return jitteredDelay * (0.85 + randomFn() * 0.3)
    case "typing-test":
      // For typing test, use the test WPM with natural variance
      // Add some human-like variation: occasional faster bursts and slower moments
      const variation = 0.85 + randomFn() * 0.3 // 85% to 115% of base
      return jitteredDelay * variation
    default:
      return jitteredDelay
  }
}

/**
 * Build delay plan for Steady engine.
 * Uniform pace with low variance.
 */
function buildSteadyDelays(
  textSlice: string,
  baseCharDelayMs: number,
  range: { min: number; max: number },
  progress: number,
  randomFn: () => number,
  temporalDrift: number = 0
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0

  for (let i = 0; i < textSlice.length; i++) {
    // Use range-based delay as primary, blend with duration target
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
    const blendRatio = 0.7
    const blended = rangeDelay * blendRatio + baseCharDelayMs * (1 - blendRatio)

    const d = profileAdjustedDelay(blended, "steady", progress, randomFn, temporalDrift)
    charDelays.push(Math.max(50, Math.round(d)))
  }

  // Apply context pauses
  batchPauseMs = applyContextPauses(textSlice, batchPauseMs, randomFn)

  return { charDelays, batchPauseMs }
}

/**
 * Build delay plan for Fatigue engine.
 * Progressive slowdown over time.
 */
function buildFatigueDelays(
  textSlice: string,
  baseCharDelayMs: number,
  range: { min: number; max: number },
  progress: number,
  randomFn: () => number,
  temporalDrift: number = 0
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0

  for (let i = 0; i < textSlice.length; i++) {
    // Use range-based delay as primary, blend with duration target
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
    const blendRatio = 0.7
    const blended = rangeDelay * blendRatio + baseCharDelayMs * (1 - blendRatio)

    const d = profileAdjustedDelay(blended, "fatigue", progress, randomFn, temporalDrift)
    charDelays.push(Math.max(50, Math.round(d)))
  }

  // Apply context pauses
  batchPauseMs = applyContextPauses(textSlice, batchPauseMs, randomFn)

  return { charDelays, batchPauseMs }
}

/**
 * Build delay plan for Burst engine.
 * Fast typing with occasional thinking pauses.
 */
function buildBurstDelays(
  textSlice: string,
  baseCharDelayMs: number,
  range: { min: number; max: number },
  progress: number,
  randomFn: () => number,
  temporalDrift: number = 0
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0

  for (let i = 0; i < textSlice.length; i++) {
    // Use range-based delay as primary, blend with duration target
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
    const blendRatio = 0.7
    const blended = rangeDelay * blendRatio + baseCharDelayMs * (1 - blendRatio)

    const d = profileAdjustedDelay(blended, "burst", progress, randomFn, temporalDrift)
    charDelays.push(Math.max(50, Math.round(d)))
  }

  // Apply context pauses
  batchPauseMs = applyContextPauses(textSlice, batchPauseMs, randomFn)

  // Burst mode: occasional thinking pause
  if (randomFn() < 0.25) {
    batchPauseMs += coreRandomInt(600, 1200, randomFn)
  }

  return { charDelays, batchPauseMs }
}

/**
 * Build delay plan for Micropause engine.
 * Frequent small hesitations.
 */
function buildMicropauseDelays(
  textSlice: string,
  baseCharDelayMs: number,
  range: { min: number; max: number },
  progress: number,
  randomFn: () => number,
  temporalDrift: number = 0
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0

  for (let i = 0; i < textSlice.length; i++) {
    // Use range-based delay as primary, blend with duration target
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
    const blendRatio = 0.7
    const blended = rangeDelay * blendRatio + baseCharDelayMs * (1 - blendRatio)

    const d = profileAdjustedDelay(blended, "micropause", progress, randomFn, temporalDrift)
    charDelays.push(Math.max(50, Math.round(d)))
  }

  // Apply context pauses
  batchPauseMs = applyContextPauses(textSlice, batchPauseMs, randomFn)

  // Micropause mode: frequent small hesitations
  if (randomFn() < 0.4) {
    batchPauseMs += coreRandomInt(100, 350, randomFn)
  }

  return { charDelays, batchPauseMs }
}

/**
 * Build delay plan for Typing-Test engine.
 * Matches user WPM with natural variance and gentle corrections.
 */
function buildTypingTestDelays(
  textSlice: string,
  baseCharDelayMs: number,
  range: { min: number; max: number },
  progress: number,
  randomFn: () => number,
  temporalDrift: number = 0,
  wpmCorrectionFactor: number = 1.0
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0

  for (let i = 0; i < textSlice.length; i++) {
    // Use range-based delay as primary, blend with duration target
    // For typing-test profile, use more of the WPM-based range (80%) vs duration target (20%)
    // Apply gentle WPM correction factor
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
    let blendRatio = 0.8
    
    // Gentle adaptive blending: only adjust after persistent drift (handled in state)
    // For now, use base 80% blend ratio
    
    const blended = (rangeDelay * blendRatio + baseCharDelayMs * (1 - blendRatio)) * wpmCorrectionFactor

    const d = profileAdjustedDelay(blended, "typing-test", progress, randomFn, temporalDrift)
    charDelays.push(Math.max(50, Math.round(d)))
  }

  // Apply context pauses
  batchPauseMs = applyContextPauses(textSlice, batchPauseMs, randomFn)

  // Typing test profile: occasional natural pauses (like real typing)
  if (randomFn() < 0.15) {
    batchPauseMs += coreRandomInt(200, 600, randomFn)
  }

  return { charDelays, batchPauseMs }
}

/**
 * Core delay plan builder that routes to profile-specific functions.
 * All engines share the same core logic but have distinct personalities.
 */
function buildDelayPlanCore(
  textSlice: string,
  baseCharDelayMs: number,
  profile: TypingProfile,
  globalProgress: number,
  testWPM: number | undefined,
  randomFn: () => number,
  temporalDrift: number = 0,
  wpmCorrectionFactor: number = 1.0
): DelayPlan {
  // Get speed range based on profile
  // For typing-test with extreme WPM, use clamped range
  let range = getProfileRange(profile, testWPM)
  if (profile === "typing-test" && testWPM) {
    const clamped = clampWPMRange(testWPM)
    if (clamped.adjusted) {
      range = { min: clamped.min, max: clamped.max }
    }
  }

  // Route to profile-specific builder
  switch (profile) {
    case "steady":
      return buildSteadyDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
    case "fatigue":
      return buildFatigueDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
    case "burst":
      return buildBurstDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
    case "micropause":
      return buildMicropauseDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
    case "typing-test":
      return buildTypingTestDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift, wpmCorrectionFactor)
    default:
      // Fallback to steady
      return buildSteadyDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
  }
}

/**
 * Compute per-character delays and a batch-level pause for punctuation/paragraphs/bursts.
 * With small batches (1-5 chars), this creates realistic human typing rhythm.
 * 
 * Supports optional engine state for PRNG and temporal drift.
 * Falls back to Math.random() if no state provided (backward compatible).
 */
export function buildDelayPlan(
  textSlice: string,
  baseCharDelayMs: number,
  profile: TypingProfile,
  globalProgress: number, // 0..1 of overall text
  testWPM?: number, // WPM from typing test for "typing-test" profile
  randomState?: RandomState, // Optional PRNG state
  temporalState?: TemporalState, // Optional temporal state for drift
  wpmState?: WPMState // Optional WPM state for typing-test corrections
): DelayPlan {
  // Use PRNG if state provided, otherwise fallback to Math.random()
  const randomFn = randomState
    ? () => nextRandom(randomState)
    : () => Math.random()

  // Get temporal drift factor (0 if no state)
  const temporalDrift = temporalState?.driftFactor ?? 0

  // Get WPM correction factor (1.0 if no state or not typing-test)
  const wpmCorrectionFactor = (profile === "typing-test" && wpmState)
    ? wpmState.correctionFactor
    : 1.0

  // Build delay plan using core
  const plan = buildDelayPlanCore(
    textSlice,
    baseCharDelayMs,
    profile,
    globalProgress,
    testWPM,
    randomFn,
    temporalDrift,
    wpmCorrectionFactor
  )

  // Enforce minimum delays
  const enforced = enforceMinimumDelays(plan.charDelays, plan.batchPauseMs)

  // Validate plan
  const validation = validateDelayPlan({ charDelays: enforced.charDelays, batchPauseMs: enforced.batchPauseMs })
  if (!validation.valid) {
    logger.warn("Delay plan validation failed:", validation.errors)
    // Return plan anyway, but log warning
  }

  return {
    charDelays: enforced.charDelays,
    batchPauseMs: enforced.batchPauseMs,
  }
}

/**
 * Compose multiple engines with weights for hybrid profiles.
 * This allows creating custom typing behaviors by blending engines.
 * 
 * Example: composeEngines(["steady", "micropause"], [0.7, 0.3])
 * creates a profile that's 70% steady and 30% micropause.
 */
export function composeEngines(
  profiles: TypingProfile[],
  weights: number[],
  textSlice: string,
  baseCharDelayMs: number,
  globalProgress: number,
  testWPM: number | undefined,
  randomFn: () => number,
  temporalDrift: number = 0,
  wpmCorrectionFactor: number = 1.0
): DelayPlan {
  if (profiles.length !== weights.length) {
    throw new Error("Profiles and weights arrays must have the same length")
  }

  // Normalize weights
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const normalizedWeights = weights.map(w => w / totalWeight)

  // Get range (use first profile's range, or typing-test if present)
  const primaryProfile = profiles[0]
  const range = getProfileRange(primaryProfile, testWPM)

  // Build plans for each engine
  const plans = profiles.map(profile => {
    switch (profile) {
      case "steady":
        return buildSteadyDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
      case "fatigue":
        return buildFatigueDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
      case "burst":
        return buildBurstDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
      case "micropause":
        return buildMicropauseDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
      case "typing-test":
        return buildTypingTestDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift, wpmCorrectionFactor)
      default:
        return buildSteadyDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift)
    }
  })

  // Blend delays and pauses by weighted average
  const blendedCharDelays: number[] = []
  const maxLength = Math.max(...plans.map(p => p.charDelays.length))

  for (let i = 0; i < maxLength; i++) {
    let blendedDelay = 0
    for (let j = 0; j < plans.length; j++) {
      if (i < plans[j].charDelays.length) {
        blendedDelay += plans[j].charDelays[i] * normalizedWeights[j]
      }
    }
    blendedCharDelays.push(Math.max(50, Math.round(blendedDelay)))
  }

  // Blend pauses
  const blendedBatchPauseMs = plans.reduce((sum, plan, i) => {
    return sum + plan.batchPauseMs * normalizedWeights[i]
  }, 0)

  return {
    charDelays: blendedCharDelays,
    batchPauseMs: Math.round(blendedBatchPauseMs),
  }
}
