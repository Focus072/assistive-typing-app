import type { TypingProfile } from "@/types"
import { MIN_INTERVAL_MS } from "./batching"
import type { DelayPlan } from "./typing-delays"

// Micro-pause ranges (ms) - natural thinking pauses
export const MICRO_PAUSES = {
  sentence: { min: 500, max: 1200 },    // . ! ? → end of thought
  comma: { min: 150, max: 400 },         // , → brief pause
  longWord: { min: 100, max: 300 },      // typing longer words slowly
  paragraph: { min: 1000, max: 2500 },   // \n\n → significant pause
  burstPause: { min: 600, max: 1200 },   // burst mode thinking pause
  wordBoundary: { min: 50, max: 150 },   // space between words
}

// Base character delay ranges (ms) - tuned for human-like typing
// Average typing speed: 40 WPM = ~200ms per char, 60 WPM = ~130ms per char
export const RANGES = {
  normal: { min: 80, max: 280 },   // ~40-60 WPM, natural variance
  fast: { min: 50, max: 150 },      // ~70+ WPM, experienced typist
  slow: { min: 150, max: 400 },     // ~25-35 WPM, careful typing
}

/**
 * Calculate delay range based on WPM
 * Formula: average delay = (60 seconds / WPM) / 5 chars per word * 1000ms
 * Then create a range around that average with variance
 */
export function getWPMRange(wpm: number): { min: number; max: number } {
  // Average delay per character in ms
  const avgDelayMs = (60 / wpm / 5) * 1000
  
  // Create variance: ±30% for natural variation
  const variance = avgDelayMs * 0.3
  
  // Clamp to realistic bounds (50ms min, 500ms max)
  const min = Math.max(50, Math.round(avgDelayMs - variance))
  const max = Math.min(500, Math.round(avgDelayMs + variance))
  
  return { min, max }
}

/**
 * Compute baseCharDelay from total duration target.
 * Clamps to realistic human typing speeds (50-500ms per char).
 */
export function computeBaseCharDelayMs(totalChars: number, durationMinutes: number): number {
  if (totalChars <= 0) return 150
  const durationMs = durationMinutes * 60 * 1000
  const rawDelay = durationMs / totalChars
  // Clamp to realistic range: 50ms (very fast) to 500ms (very slow)
  return Math.min(500, Math.max(50, rawDelay))
}

/**
 * Get speed range based on profile
 */
export function getProfileRange(profile: TypingProfile, testWPM?: number): { min: number; max: number } {
  if (profile === "typing-test" && testWPM) {
    return getWPMRange(testWPM)
  }
  
  switch (profile) {
    case "burst":
      return RANGES.fast
    case "fatigue":
      return RANGES.slow
    default:
      return RANGES.normal
  }
}

/**
 * Apply context-aware pauses based on punctuation and content.
 * All engines should call this to ensure consistent pause behavior.
 */
export function applyContextPauses(
  textSlice: string,
  batchPauseMs: number,
  randomFn: () => number
): number {
  let pauseMs = batchPauseMs

  for (let i = 0; i < textSlice.length; i++) {
    const ch = textSlice[i]

    // Micro-pause triggers based on character
    if (ch === "." || ch === "!" || ch === "?") {
      pauseMs += randomInt(MICRO_PAUSES.sentence.min, MICRO_PAUSES.sentence.max, randomFn)
    } else if (ch === ",") {
      pauseMs += randomInt(MICRO_PAUSES.comma.min, MICRO_PAUSES.comma.max, randomFn)
    } else if (ch === " ") {
      // Small pause between words
      pauseMs += randomInt(MICRO_PAUSES.wordBoundary.min, MICRO_PAUSES.wordBoundary.max, randomFn)
    } else if (ch === "\n") {
      // Newline = thinking pause
      pauseMs += randomInt(300, 600, randomFn)
    }
  }

  // Additional heuristics based on content
  const words = textSlice.split(/\s+/)
  if (words.some((w) => w.length > 8)) {
    // Long words slow you down
    pauseMs += randomInt(MICRO_PAUSES.longWord.min, MICRO_PAUSES.longWord.max, randomFn)
  }
  if (textSlice.includes("\n\n")) {
    pauseMs += randomInt(MICRO_PAUSES.paragraph.min, MICRO_PAUSES.paragraph.max, randomFn)
  }

  return pauseMs
}

/**
 * Enforce minimum delays to ensure realistic typing behavior.
 * All engines must call this to guarantee minimums are respected.
 */
export function enforceMinimumDelays(
  charDelays: number[],
  batchPauseMs: number
): { charDelays: number[]; batchPauseMs: number; totalDelayMs: number } {
  // Enforce minimum 50ms per character
  const enforcedCharDelays = charDelays.map(delay => Math.max(50, delay))
  
  // Calculate total delay and enforce minimum batch interval
  const perCharSum = enforcedCharDelays.reduce((a, b) => a + b, 0)
  const totalDelayMs = Math.max(MIN_INTERVAL_MS, perCharSum + batchPauseMs)
  
  return {
    charDelays: enforcedCharDelays,
    batchPauseMs,
    totalDelayMs: Math.round(totalDelayMs),
  }
}

/**
 * Validate that a delay plan is complete and valid
 */
export function validateDelayPlan(plan: DelayPlan): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!plan.charDelays || plan.charDelays.length === 0) {
    errors.push("Delay plan must have at least one character delay")
  }
  
  if (plan.charDelays.some(delay => delay < 50)) {
    errors.push("All character delays must be at least 50ms")
  }
  
  if (plan.batchPauseMs < 0) {
    errors.push("Batch pause must be non-negative")
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Helper function for random integer generation
 */
export function randomInt(min: number, max: number, randomFn: () => number): number {
  return Math.floor(randomFn() * (max - min + 1)) + min
}

/**
 * Analytics interface for engine behavior tracking.
 * Used for future metrics collection and analysis.
 */
export interface EngineAnalytics {
  averageDelay: number
  pauseCount: number
  pauseTotalMs: number
  speedDrift: number // WPM change over time (calculated from temporal state)
  variance: number
  batchCount: number
}

/**
 * Collect analytics from a delay plan.
 */
export function collectAnalytics(
  plan: DelayPlan,
  temporalState?: { driftFactor: number; batchCount: number }
): EngineAnalytics {
  const averageDelay = plan.charDelays.length > 0
    ? plan.charDelays.reduce((a, b) => a + b, 0) / plan.charDelays.length
    : 0

  const variance = plan.charDelays.length > 0
    ? (() => {
        const mean = averageDelay
        const squaredDiffs = plan.charDelays.map(d => Math.pow(d - mean, 2))
        return squaredDiffs.reduce((a, b) => a + b, 0) / plan.charDelays.length
      })()
    : 0

  // Speed drift is the temporal drift factor converted to WPM change
  // Positive drift = slowing down, negative = speeding up
  const speedDrift = temporalState
    ? temporalState.driftFactor * 100 // Convert to percentage
    : 0

  return {
    averageDelay,
    pauseCount: plan.batchPauseMs > 0 ? 1 : 0,
    pauseTotalMs: plan.batchPauseMs,
    speedDrift,
    variance,
    batchCount: temporalState?.batchCount ?? 1,
  }
}

/**
 * Validate WPM accuracy by comparing expected total time to target duration.
 */
export function validateWPMAccuracy(
  totalChars: number,
  totalDelayMs: number,
  targetWPM: number
): { valid: boolean; actualWPM: number; deviation: number; warning?: string } {
  if (totalChars === 0 || totalDelayMs === 0) {
    return {
      valid: true,
      actualWPM: targetWPM,
      deviation: 0,
    }
  }

  // Calculate actual WPM
  const actualWPM = (totalChars / 5) / (totalDelayMs / 60000)
  
  // Calculate deviation percentage
  const deviation = ((actualWPM - targetWPM) / targetWPM) * 100

  // Warning if deviation > 10%
  let warning: string | undefined
  if (Math.abs(deviation) > 10) {
    warning = `WPM deviation is ${deviation.toFixed(1)}% (target: ${targetWPM}, actual: ${actualWPM.toFixed(1)})`
  }

  return {
    valid: Math.abs(deviation) <= 15, // Allow up to 15% deviation
    actualWPM,
    deviation,
    warning,
  }
}

/**
 * Clamp WPM range for extreme values to ensure natural behavior.
 */
export function clampWPMRange(wpm: number): { min: number; max: number; adjusted: boolean } {
  let adjusted = false
  let min = 50
  let max = 500

  if (wpm >= 100) {
    // Very fast: ensure pauses don't make it feel robotic
    // Use tighter variance for high WPM
    const avgDelay = (60 / wpm / 5) * 1000
    const variance = avgDelay * 0.2 // Reduced variance for fast typers
    min = Math.max(50, Math.round(avgDelay - variance))
    max = Math.min(500, Math.round(avgDelay + variance))
    adjusted = true
  } else if (wpm <= 20) {
    // Very slow: ensure it doesn't stall or jitter
    // Use tighter variance for low WPM
    const avgDelay = (60 / wpm / 5) * 1000
    const variance = avgDelay * 0.25 // Slightly reduced variance for slow typers
    min = Math.max(50, Math.round(avgDelay - variance))
    max = Math.min(500, Math.round(avgDelay + variance))
    adjusted = true
  } else {
    // Normal range: use standard calculation
    const result = getWPMRange(wpm)
    min = result.min
    max = result.max
  }

  return { min, max, adjusted }
}

