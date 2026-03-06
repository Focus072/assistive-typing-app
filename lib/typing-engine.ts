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

// QWERTY adjacent keys for realistic typo simulation
const KEYBOARD_ADJACENCY: Record<string, string> = {
  a: "sqwz",   b: "vghn",   c: "xdfv",   d: "sfxce",  e: "wsdr",
  f: "dgvrt",  g: "fhbyt",  h: "gjnuy",  i: "ujko",   j: "hknui",
  k: "jlmio",  l: "kop",    m: "njk",    n: "bmhj",   o: "ikpl",
  p: "ol",     q: "wa",     r: "etdf",   s: "awdxze", t: "ryfg",
  u: "yhji",   v: "cfgb",   w: "qase",   x: "zsdc",   y: "tghu",
  z: "asx",
}

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
  wrongChars?: string // adjacent-key chars to type then backspace (1-3 chars)
  pauseAfterMs: number // hesitation after catching the mistake
}

export interface BatchPlan {
  batch: TypingBatch | null
  totalDelayMs: number
  perCharDelays: number[]
  batchPauseMs: number
  mistakePlan: MistakePlan
  engineState: EngineState
}

// ~3% chance per word in the batch. For a typical 3-char batch (~0.6 words)
// this fires roughly every 50 batches — enough to be realistic without being
// distracting. Scaled by word count so longer batches get proportionally more.
const MISTAKE_CHANCE_PER_WORD = 0.03

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
    fatigueState: state.fatigueState ? { ...state.fatigueState } : undefined,
    steadyState: state.steadyState ? { ...state.steadyState } : undefined,
    lastBatchSize: state.lastBatchSize,
    pendingPauseMs: state.pendingPauseMs,
  }
}

export function planMistake(
  batchText: string,
  randomFn: () => number = () => Math.random()
): MistakePlan {
  if (batchText.length < 2) return { hasMistake: false, deleteCount: 0, pauseAfterMs: 0 }

  // Scale mistake probability by approximate word count in the batch
  const wordCount = Math.max(1, batchText.split(/\s+/).filter(Boolean).length)
  const mistakeChance = 1 - Math.pow(1 - MISTAKE_CHANCE_PER_WORD, wordCount)
  if (randomFn() > mistakeChance) return { hasMistake: false, deleteCount: 0, pauseAfterMs: 0 }

  // Hesitation after catching the mistake: 100-400ms (the "oh crap" moment)
  const pauseAfterMs = 100 + Math.floor(randomFn() * 300)

  // Decide typo type: ~40% transposition (swapping two adjacent chars, e.g. "teh" for "the"),
  // ~60% adjacent-key substitution (hitting a neighboring key)
  const typoTypeRoll = randomFn()

  if (typoTypeRoll < 0.40) {
    // --- Transposition typo ---
    // Find the last pair of adjacent alphabetic characters to swap
    for (let i = batchText.length - 1; i >= 1; i--) {
      if (/[a-zA-Z]/.test(batchText[i]) && /[a-zA-Z]/.test(batchText[i - 1])) {
        // Swap the pair: "th" becomes "ht"
        const wrongChars = batchText[i] + batchText[i - 1]
        return { hasMistake: true, deleteCount: 2, wrongChars, pauseAfterMs }
      }
    }
    // No adjacent alpha pair found — fall through to adjacent-key substitution
  }

  // --- Adjacent-key substitution typo ---
  // Determine how many wrong characters to type before noticing (1-3).
  // Most mistakes are caught after 1 char; occasionally 2-3 slip through.
  const multiRoll = randomFn()
  const wrongCharCount = multiRoll < 0.65 ? 1 : multiRoll < 0.90 ? 2 : 3

  // Build the wrong character string from QWERTY adjacency
  let wrongChars = ""
  // Start from the last alphabetic char in the batch
  const lastAlpha = batchText.split("").reverse().find((c) => /[a-zA-Z]/.test(c))
  if (lastAlpha) {
    const lc = lastAlpha.toLowerCase()
    const neighbors = KEYBOARD_ADJACENCY[lc]
    if (neighbors) {
      for (let i = 0; i < wrongCharCount; i++) {
        // Each subsequent wrong char uses a neighbor of the previous wrong char
        // (simulating fingers continuing on the wrong key area)
        const source = i === 0 ? lc : wrongChars[i - 1].toLowerCase()
        const adj = KEYBOARD_ADJACENCY[source] ?? neighbors
        wrongChars += adj[Math.floor(randomFn() * adj.length)]
      }
    }
  }

  if (wrongChars.length > 0) {
    return { hasMistake: true, deleteCount: wrongChars.length, wrongChars, pauseAfterMs }
  }

  // Fallback: simple backspace for non-alpha chars
  return { hasMistake: true, deleteCount: 1, pauseAfterMs }
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

  const upcomingText = fullText.slice(currentIndex, currentIndex + 8)
  const batchSize = chooseBatchSize(existingState?.lastBatchSize, randomFn, upcomingText)
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
    if (existingState?.fatigueState) {
      emptyEngineState.fatigueState = existingState.fatigueState
    }
    if (existingState?.steadyState) {
      emptyEngineState.steadyState = existingState.steadyState
    }
    return {
      batch: null,
      totalDelayMs: 0,
      perCharDelays: [],
      batchPauseMs: 0,
      mistakePlan: { hasMistake: false, deleteCount: 0, pauseAfterMs: 0 },
      engineState: emptyEngineState,
    }
  }

  const baseCharDelay = computeBaseCharDelayMs(totalChars, durationMinutes)
  const progress = currentIndex / Math.max(1, totalChars)

  const {
    charDelays,
    batchPauseMs,
    burstState: nextBurstState,
    fatigueState: nextFatigueState,
    steadyState: nextSteadyState,
  } = buildDelayPlan(
    batch.text,
    baseCharDelay,
    profile,
    progress,
    testWPM,
    randomState,
    temporalState,
    wpmState,
    existingState?.burstState,
    existingState?.fatigueState,
    existingState?.steadyState,
    fullText,   // pass full text for word-length velocity
    currentIndex // character offset of this batch within fullText
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

  // Session warm-up / cooldown: the first ~2 minutes are slower (finding rhythm)
  // and the last ~2 minutes taper off (wrapping up). Uses elapsed progress as a
  // proxy for time because we don't track wall-clock start inside the engine.
  // Progress-based approximation: warmup = first 8% of chars ≈ first ~2 min of a
  // 25-min session; cooldown = last 8%.
  const WARMUP_THRESHOLD = 0.08
  const COOLDOWN_THRESHOLD = 0.92
  const MAX_WARMUP_SLOWDOWN = 0.15 // 15% slower at the very start
  const MAX_COOLDOWN_SLOWDOWN = 0.10 // 10% slower at the very end

  let sessionMultiplier = 1.0
  if (progress < WARMUP_THRESHOLD) {
    // Linear ramp from 1.15 at 0% to 1.0 at WARMUP_THRESHOLD
    sessionMultiplier = 1 + MAX_WARMUP_SLOWDOWN * (1 - progress / WARMUP_THRESHOLD)
  } else if (progress > COOLDOWN_THRESHOLD) {
    // Linear ramp from 1.0 at COOLDOWN_THRESHOLD to 1.10 at 100%
    const cooldownProgress = (progress - COOLDOWN_THRESHOLD) / (1 - COOLDOWN_THRESHOLD)
    sessionMultiplier = 1 + MAX_COOLDOWN_SLOWDOWN * cooldownProgress
  }

  // Apply session multiplier to per-char delays (replaces the old 8%-only ramp
  // in buildDelayPlan — that one is now redundant but harmless as a double layer)
  const sessionAdjustedDelays = sessionMultiplier !== 1.0
    ? charDelays.map(d => Math.round(d * sessionMultiplier))
    : charDelays

  // Consume any pending pause from the previous batch's sentence/paragraph ending.
  // This makes the pause appear *before* typing the new sentence, not after the period.
  let adjustedBatchPauseMs = batchPauseMs + (existingState?.pendingPauseMs ?? 0)

  // Compute a forward-carry pause if this batch ends at a sentence or paragraph boundary.
  // The pause will be consumed at the *start* of the next batch, simulating the natural
  // thinking gap before composing a new sentence.
  let nextPendingPauseMs = 0
  const lastChar = batch.text[batch.text.length - 1]
  const endsWithSentence = lastChar === "." || lastChar === "!" || lastChar === "?"
  const endsWithParagraph = batch.text.endsWith("\n\n") || batch.text.endsWith("\n")

  if (endsWithParagraph) {
    // Paragraph break: 400-900ms thinking pause before next paragraph
    nextPendingPauseMs = 400 + Math.floor(randomFn() * 500)
  } else if (endsWithSentence) {
    // Sentence break: 150-400ms composing pause before next sentence
    nextPendingPauseMs = 150 + Math.floor(randomFn() * 250)
  }

  // Total delay = sum per-char + batch pause, but enforce minimum interval
  // Note: buildDelayPlan already enforces minimums, but we recalculate total here
  const perCharSum = sessionAdjustedDelays.reduce((a, b) => a + b, 0)
  const totalDelayMs = Math.round(Math.max(MIN_INTERVAL_MS, perCharSum + adjustedBatchPauseMs))

  const mistakePlan = planMistake(batch.text, randomFn)
  const averageDelay = sessionAdjustedDelays.length > 0 ? perCharSum / sessionAdjustedDelays.length : 0
  const nextTemporalState = updateTemporalState(temporalState, averageDelay)
  const nextWPMState = profile === "typing-test" && wpmState && testWPM !== undefined
    ? updateWPMState(wpmState, totalDelayMs, batch.text.length, testWPM)
    : undefined

  const engineState: EngineState = {
    randomState,
    temporalState: nextTemporalState,
    lastBatchSize: batch.text.length,
    pendingPauseMs: nextPendingPauseMs > 0 ? nextPendingPauseMs : undefined,
  }
  if (nextWPMState) {
    engineState.wpmState = nextWPMState
  }
  if (nextBurstState) {
    engineState.burstState = nextBurstState
  }
  if (nextFatigueState) {
    engineState.fatigueState = nextFatigueState
  }
  if (nextSteadyState) {
    engineState.steadyState = nextSteadyState
  }

  return {
    batch,
    totalDelayMs,
    perCharDelays: sessionAdjustedDelays,
    batchPauseMs: adjustedBatchPauseMs,
    mistakePlan,
    engineState,
  }
}
