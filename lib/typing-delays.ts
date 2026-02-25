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
import type { BurstState, FatigueState, SteadyState, TemporalState, WPMState } from "./typing-state"

export interface DelayPlan {
  charDelays: number[] // per-character delays
  batchPauseMs: number // extra pause after batch (punctuation/micro-pause)
  burstState?: BurstState // next burst phase state (burst profile only)
  fatigueState?: FatigueState // next fatigue phase state (fatigue profile only)
  steadyState?: SteadyState // next steady phase state (steady profile only)
}

export interface TypingTestConfig {
  wpm: number // Words per minute from typing test
}

export interface MicropauseContextProfile {
  triggerChance: number
  pauseRange: { min: number; max: number }
  difficultyScore: number
}

// Re-export for backward compatibility
export { computeBaseCharDelayMs }

/**
 * Analyze text slice complexity to drive micropause behavior.
 * Higher complexity increases both hesitation probability and pause length.
 */
export function analyzeMicropauseContext(textSlice: string): MicropauseContextProfile {
  const punctuationCount = (textSlice.match(/[,:;!?]/g) ?? []).length
  const sentenceBoundaryCount = (textSlice.match(/[.!?]/g) ?? []).length
  const longWordCount = textSlice.split(/\s+/).filter((word) => word.length > 8).length
  const caseTransitionCount = (textSlice.match(/[a-z][A-Z]/g) ?? []).length
  const numericTokenCount = (textSlice.match(/\d+/g) ?? []).length

  const difficultyScore =
    punctuationCount * 0.55 +
    sentenceBoundaryCount * 0.8 +
    longWordCount * 0.6 +
    caseTransitionCount * 0.5 +
    numericTokenCount * 0.35

  const normalizedDifficulty = Math.min(1, difficultyScore / 3.5)
  const triggerChance = Math.min(0.72, 0.2 + normalizedDifficulty * 0.46)

  let pauseRange: { min: number; max: number } = { min: 120, max: 240 }
  if (difficultyScore > 1.4) {
    pauseRange = { min: 170, max: 320 }
  }
  if (difficultyScore > 2.4) {
    pauseRange = { min: 220, max: 430 }
  }

  return {
    triggerChance,
    pauseRange,
    difficultyScore,
  }
}

/**
 * Find the length of the word containing the character at charOffset in text.
 * Treats spaces and newlines as word boundaries — no library needed.
 */
function getWordLengthAt(text: string, charOffset: number): number {
  const clampedOffset = Math.max(0, Math.min(charOffset, text.length - 1))
  let start = clampedOffset
  while (start > 0 && text[start - 1] !== ' ' && text[start - 1] !== '\n') {
    start--
  }
  let end = clampedOffset
  while (end < text.length && text[end] !== ' ' && text[end] !== '\n') {
    end++
  }
  return end - start
}

/**
 * Apply word-length-aware velocity to a per-character delay array.
 *
 * Long words (7+ chars): ~60% chance of a randomized slowdown (1.15–1.45×).
 * The other 40% sail through at full speed — "flow state" on a familiar word.
 *
 * Short words (≤4 chars): ~70% chance of a randomized speed bonus (0.85–0.95×).
 * Mimics natural acceleration on common short words ("the", "and", "is").
 *
 * Two layers of randomness (gate + magnitude) prevent the metronome effect
 * where every long word predictably slows down by the same amount.
 */
function applyWordLengthVelocity(
  charDelays: number[],
  fullText: string,
  sliceStart: number,
  randomFn: () => number
): number[] {
  return charDelays.map((delay, i) => {
    const wordLen = getWordLengthAt(fullText, sliceStart + i)
    if (wordLen >= 7 && randomFn() < 0.60) {
      // Long word gate fired: randomized slowdown
      const multiplier = 1.15 + randomFn() * 0.30 // 1.15–1.45×
      return Math.max(50, Math.round(delay * multiplier))
    }
    if (wordLen <= 4 && randomFn() < 0.70) {
      // Short word gate fired: randomized speed bonus
      const multiplier = 0.85 + randomFn() * 0.10 // 0.85–0.95×
      return Math.max(50, Math.round(delay * multiplier))
    }
    return delay
  })
}

/**
 * Character-frequency multipliers: common letters (high muscle memory) are
 * typed slightly faster; rare letters require more deliberate key-finding.
 * Only alphabetic chars are adjusted — digits, punctuation, and whitespace
 * keep their base delay.  The effect is subtle (±5-10%) but adds another
 * layer of realistic variance.
 */
const CHAR_FREQ_MULTIPLIER: Record<string, number> = {
  // Most common English letters → slightly faster
  e: 0.93, t: 0.94, a: 0.94, o: 0.95, i: 0.95, n: 0.95, s: 0.96,
  h: 0.96, r: 0.96,
  // Uncommon letters → slightly slower
  z: 1.08, q: 1.09, x: 1.07, j: 1.06, k: 1.04, v: 1.03,
}

function applyCharFrequencyVariation(
  charDelays: number[],
  textSlice: string,
  randomFn: () => number
): number[] {
  return charDelays.map((delay, i) => {
    const ch = textSlice[i]?.toLowerCase()
    const multiplier = ch ? CHAR_FREQ_MULTIPLIER[ch] : undefined
    if (multiplier !== undefined) {
      // Add a small random spread (±2%) so it's not perfectly deterministic
      const jitter = 1 + (randomFn() - 0.5) * 0.04
      return Math.max(50, Math.round(delay * multiplier * jitter))
    }
    return delay
  })
}

/**
 * QWERTY hand assignment: left hand covers keys on the left half of the
 * keyboard, right hand the rest.  When consecutive characters switch hands
 * there's a small coordination penalty (~5-15ms).  Same-hand rolls are
 * slightly faster (−3-8ms bonus).
 */
const LEFT_HAND = new Set("qwertasdfgzxcvb12345`~!@#$%")
const RIGHT_HAND = new Set("yuiophjklnm67890-=[]\\;',./^&*()_+{}|:\"<>?")

function getHand(ch: string): "left" | "right" | null {
  const lc = ch.toLowerCase()
  if (LEFT_HAND.has(lc)) return "left"
  if (RIGHT_HAND.has(lc)) return "right"
  return null // space, newline, etc.
}

function applyHandSwitchDelays(
  charDelays: number[],
  textSlice: string,
  randomFn: () => number
): number[] {
  return charDelays.map((delay, i) => {
    if (i === 0) return delay
    const prevHand = getHand(textSlice[i - 1])
    const currHand = getHand(textSlice[i])
    if (!prevHand || !currHand) return delay
    if (prevHand !== currHand) {
      // Hand switch: small penalty
      return delay + 5 + Math.floor(randomFn() * 10)
    }
    // Same-hand roll: small speed bonus
    return Math.max(50, delay - 3 - Math.floor(randomFn() * 5))
  })
}

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
      // 0.97-1.03: reflects a consistent typist with minimal rhythm drift
      return jitteredDelay * (0.97 + randomFn() * 0.06)
    case "fatigue": {
      // Non-linear progress curve (not linear)
      const fatigueProgress = Math.pow(progress, 1.1)
      // 0.18 base: reaches ~18% slowdown at full fatigue; 0.35 jitter keeps it organic
      const fatigue = 1 + fatigueProgress * (0.18 * (1 + randomFn() * 0.35))
      return jitteredDelay * fatigue * (0.96 + randomFn() * 0.1)
    }
    case "burst": {
      // 0.62-0.80: bursts are noticeably faster (~20-38% below base)
      // Occasional long pauses handled by the burst state machine, not here
      return jitteredDelay * (0.62 + randomFn() * 0.18)
    }
    case "micropause":
      // 0.95-1.22: wide range creates the uneven hesitation pattern
      return jitteredDelay * (0.95 + randomFn() * 0.27)
    case "typing-test":
      // For typing test, use the test WPM with natural variance
      // Add some human-like variation: occasional faster bursts and slower moments
      // 0.90-1.10: tighter than other profiles so WPM correction stays effective
      const variation = 0.9 + randomFn() * 0.2
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
  temporalDrift: number = 0,
  steadyState?: SteadyState
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0
  const currentState: SteadyState = steadyState ?? {
    phase: "focus",
    // 18-36 chars: ~4-8 small batches at the typical 3-8 char batch size
    charsUntilTransition: coreRandomInt(18, 36, randomFn),
    // Start in the faster half of the focus range (0.98-1.01)
    paceMultiplier: 0.98 + randomFn() * 0.03,
  }
  const phaseMultiplier = Math.max(0.95, Math.min(1.05, currentState.paceMultiplier))

  for (let i = 0; i < textSlice.length; i++) {
    // Weight toward the target-derived delay so the engine actually hits the WPM goal.
    // 30% range (human variance), 70% baseCharDelayMs (WPM target).
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
    const blendRatio = 0.35
    const blended = rangeDelay * blendRatio + baseCharDelayMs * (1 - blendRatio)

    const d = profileAdjustedDelay(blended, "steady", progress, randomFn, temporalDrift) * phaseMultiplier
    charDelays.push(Math.max(50, Math.round(d)))
  }

  // Apply context pauses
  batchPauseMs = applyContextPauses(textSlice, batchPauseMs, randomFn)

  // Steady rhythm windows: focus (slightly faster) and relaxed (slightly slower).
  let nextPhase = currentState.phase
  let charsUntilTransition = currentState.charsUntilTransition - textSlice.length
  let nextPaceMultiplier = currentState.paceMultiplier

  if (charsUntilTransition <= 0) {
    if (currentState.phase === "focus") {
      nextPhase = "relaxed"
      // 12-26 chars: relaxed windows are shorter so focus dominates the rhythm
      charsUntilTransition = coreRandomInt(12, 26, randomFn)
      // 1.01-1.05: relaxed is 1-5% slower than baseline
      nextPaceMultiplier = 1.01 + randomFn() * 0.04
    } else {
      nextPhase = "focus"
      // 18-36 chars: longer focus windows match how humans sustain productive typing
      charsUntilTransition = coreRandomInt(18, 36, randomFn)
      // 0.97-1.00: focus is at or slightly below baseline pace
      nextPaceMultiplier = 0.97 + randomFn() * 0.03
    }
  } else {
    const target = currentState.phase === "focus" ? 0.985 : 1.025
    const delta = (target - currentState.paceMultiplier) * 0.25
    nextPaceMultiplier = Math.max(0.95, Math.min(1.05, currentState.paceMultiplier + delta))
  }

  return {
    charDelays,
    batchPauseMs,
    steadyState: {
      phase: nextPhase,
      charsUntilTransition,
      paceMultiplier: nextPaceMultiplier,
    },
  }
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
  temporalDrift: number = 0,
  fatigueState?: FatigueState
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0
  const currentState: FatigueState = fatigueState ?? {
    phase: "build",
    // 14-30 chars: ~3-6 small batches before the first recovery check
    charsUntilTransition: coreRandomInt(14, 30, randomFn),
    // Start mid-range (0.2-0.4) so the opening doesn't feel artificially fresh
    fatigueLevel: 0.2 + randomFn() * 0.2,
  }
  const phaseMultiplier = currentState.phase === "build"
    ? 1 + currentState.fatigueLevel * (0.16 + randomFn() * 0.1)
    : 1 + currentState.fatigueLevel * (0.03 + randomFn() * 0.05)

  for (let i = 0; i < textSlice.length; i++) {
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
    const blendRatio = 0.35
    const blended = rangeDelay * blendRatio + baseCharDelayMs * (1 - blendRatio)

    const d = profileAdjustedDelay(blended, "fatigue", progress, randomFn, temporalDrift) * phaseMultiplier
    charDelays.push(Math.max(50, Math.round(d)))
  }

  // Apply context pauses
  batchPauseMs = applyContextPauses(textSlice, batchPauseMs, randomFn)

  // Fatigue cycle: build fatigue for longer windows, then briefly recover.
  let nextPhase = currentState.phase
  let charsUntilTransition = currentState.charsUntilTransition - textSlice.length
  let nextFatigueLevel = currentState.fatigueLevel

  // Normalize accumulation by chars processed so a 3-char and a 15-char batch
  // accumulate fatigue proportionally. Reference is a nominal 5-char batch
  // (midpoint of the typical 3-8 char batch range). Capped at 3x to prevent
  // runaway on unusually large batches.
  const NOMINAL_BATCH_CHARS = 5
  const charScale = Math.min(3, textSlice.length / NOMINAL_BATCH_CHARS)

  if (currentState.phase === "build") {
    nextFatigueLevel = Math.min(1, nextFatigueLevel + (0.08 + randomFn() * 0.08) * charScale)
  } else {
    nextFatigueLevel = Math.max(0.1, nextFatigueLevel - (0.1 + randomFn() * 0.08) * charScale)
  }

  if (charsUntilTransition <= 0) {
    if (currentState.phase === "build") {
      nextPhase = "recovery"
      // 6-14 chars: brief recovery window (~1-2 small batches)
      charsUntilTransition = coreRandomInt(6, 14, randomFn)
      // 180-380ms: a short mental-reset pause, noticeable but not jarring
      batchPauseMs += coreRandomInt(180, 380, randomFn)
    } else {
      nextPhase = "build"
      // Return to the same build window range as initialization
      charsUntilTransition = coreRandomInt(14, 30, randomFn)
    }
  }

  return {
    charDelays,
    batchPauseMs,
    fatigueState: {
      phase: nextPhase,
      charsUntilTransition,
      fatigueLevel: nextFatigueLevel,
    },
  }
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
  temporalDrift: number = 0,
  burstState?: BurstState
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0
  const currentState: BurstState = burstState ?? {
    phase: "burst",
    // 8-20 chars: short enough to feel like bursts, long enough to be distinct
    charsUntilTransition: coreRandomInt(8, 20, randomFn),
    pauseCooldownBatches: 0,
  }
  const phaseDelayMultiplier = currentState.phase === "settle" ? (1.18 + randomFn() * 0.12) : 1

  for (let i = 0; i < textSlice.length; i++) {
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
    const blendRatio = 0.35
    const blended = rangeDelay * blendRatio + baseCharDelayMs * (1 - blendRatio)

    const d = profileAdjustedDelay(blended, "burst", progress, randomFn, temporalDrift) * phaseDelayMultiplier
    charDelays.push(Math.max(50, Math.round(d)))
  }

  // Apply context pauses
  batchPauseMs = applyContextPauses(textSlice, batchPauseMs, randomFn)

  // Burst state machine: fast runs ("burst") followed by short settle periods.
  // Thinking pauses are tied to phase transitions and lightly rate-limited by cooldown.
  let nextPhase = currentState.phase
  let charsUntilTransition = currentState.charsUntilTransition - textSlice.length
  let pauseCooldownBatches = Math.max(0, currentState.pauseCooldownBatches - 1)

  if (charsUntilTransition <= 0) {
    if (currentState.phase === "burst") {
      nextPhase = "settle"
      // 4-10 chars: settle periods are short so bursts dominate the pattern
      charsUntilTransition = coreRandomInt(4, 10, randomFn)
      if (pauseCooldownBatches === 0) {
        // Longer pause at punctuation (thinking about next sentence) vs mid-sentence
        // 500-900ms at boundaries, 350-700ms mid-text: both feel like a human regrouping
        const hasBoundary = /[.!?,;:]/.test(textSlice)
        const minPause = hasBoundary ? 500 : 350
        const maxPause = hasBoundary ? 900 : 700
        batchPauseMs += coreRandomInt(minPause, maxPause, randomFn)
        // cooldown=2: prevents two pauses within consecutive batches
        pauseCooldownBatches = 2
      }
    } else {
      nextPhase = "burst"
      charsUntilTransition = coreRandomInt(8, 20, randomFn)
    }
  } else if (nextPhase === "burst" && pauseCooldownBatches === 0 && randomFn() < 0.08) {
    batchPauseMs += coreRandomInt(450, 900, randomFn)
    pauseCooldownBatches = 2
  }

  return {
    charDelays,
    batchPauseMs,
    burstState: {
      phase: nextPhase,
      charsUntilTransition,
      pauseCooldownBatches,
    },
  }
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
  const contextProfile = analyzeMicropauseContext(textSlice)

  for (let i = 0; i < textSlice.length; i++) {
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
    const blendRatio = 0.35
    const blended = rangeDelay * blendRatio + baseCharDelayMs * (1 - blendRatio)

    const ch = textSlice[i]
    const charHesitation =
      (/[,:;!?]/.test(ch) ? coreRandomInt(8, 28, randomFn) : 0) +
      (/[A-Z]/.test(ch) ? coreRandomInt(3, 12, randomFn) : 0)
    const d = profileAdjustedDelay(blended, "micropause", progress, randomFn, temporalDrift) + charHesitation
    charDelays.push(Math.max(50, Math.round(d)))
  }

  // Apply context pauses
  batchPauseMs = applyContextPauses(textSlice, batchPauseMs, randomFn)

  // Micropause mode: context-weighted hesitation probability and pause size.
  if (randomFn() < contextProfile.triggerChance) {
    batchPauseMs += coreRandomInt(contextProfile.pauseRange.min, contextProfile.pauseRange.max, randomFn)
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
  const correctionMagnitude = Math.min(0.06, Math.abs(wpmCorrectionFactor - 1))
  // Base blend: 35% range, 65% target. Shift toward range (higher blendRatio) when correction is active.
  const blendRatio = Math.min(0.6, 0.35 + correctionMagnitude * 1.3)

  for (let i = 0; i < textSlice.length; i++) {
    const rangeDelay = coreRandomInt(range.min, range.max, randomFn)
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
  wpmCorrectionFactor: number = 1.0,
  burstState?: BurstState,
  fatigueState?: FatigueState,
  steadyState?: SteadyState
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
      return buildSteadyDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift, steadyState)
    case "fatigue":
      return buildFatigueDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift, fatigueState)
    case "burst":
      return buildBurstDelays(textSlice, baseCharDelayMs, range, globalProgress, randomFn, temporalDrift, burstState)
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
  wpmState?: WPMState, // Optional WPM state for typing-test corrections
  burstState?: BurstState, // Optional burst phase state
  fatigueState?: FatigueState, // Optional fatigue phase state
  steadyState?: SteadyState, // Optional steady phase state
  fullText?: string, // Full source text for word-length velocity
  sliceStart?: number // Character offset of textSlice within fullText
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
    wpmCorrectionFactor,
    burstState,
    fatigueState,
    steadyState
  )

  // Apply word-length velocity layer when full-text context is available.
  // This is a universal post-process step applied on top of all profiles.
  let adjustedCharDelays = plan.charDelays
  if (fullText && sliceStart !== undefined) {
    adjustedCharDelays = applyWordLengthVelocity(plan.charDelays, fullText, sliceStart, randomFn)
  }

  // Note: session warm-up/cooldown is now handled in buildBatchPlan (typing-engine.ts)
  // which has access to durationMinutes for time-aware pacing.

  // Apply character-frequency variation: common letters slightly faster, rare ones slower.
  adjustedCharDelays = applyCharFrequencyVariation(adjustedCharDelays, textSlice, randomFn)

  // Apply hand-switching delays: small penalty when alternating left/right hand.
  adjustedCharDelays = applyHandSwitchDelays(adjustedCharDelays, textSlice, randomFn)

  // Enforce minimum delays
  const enforced = enforceMinimumDelays(adjustedCharDelays, plan.batchPauseMs)

  // Validate plan
  const validation = validateDelayPlan({ charDelays: enforced.charDelays, batchPauseMs: enforced.batchPauseMs })
  if (!validation.valid) {
    logger.warn("Delay plan validation failed:", validation.errors)
    // Return plan anyway, but log warning
  }

  return {
    charDelays: enforced.charDelays,
    batchPauseMs: enforced.batchPauseMs,
    burstState: plan.burstState,
    fatigueState: plan.fatigueState,
    steadyState: plan.steadyState,
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
