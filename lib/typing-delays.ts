import type { TypingProfile } from "@/types"

export interface DelayPlan {
  charDelays: number[] // per-character delays
  batchPauseMs: number // extra pause after batch (punctuation/micro-pause)
}

// Base character delay ranges (ms) - tuned for human-like typing
// Average typing speed: 40 WPM = ~200ms per char, 60 WPM = ~130ms per char
const RANGES = {
  normal: { min: 80, max: 280 },   // ~40-60 WPM, natural variance
  fast: { min: 50, max: 150 },      // ~70+ WPM, experienced typist
  slow: { min: 150, max: 400 },     // ~25-35 WPM, careful typing
}

// Micro-pause ranges (ms) - natural thinking pauses
const MICRO_PAUSES = {
  sentence: { min: 500, max: 1200 },    // . ! ? → end of thought
  comma: { min: 150, max: 400 },         // , → brief pause
  longWord: { min: 100, max: 300 },      // typing longer words slowly
  paragraph: { min: 1000, max: 2500 },   // \n\n → significant pause
  burstPause: { min: 600, max: 1200 },   // burst mode thinking pause
  wordBoundary: { min: 50, max: 150 },   // space between words
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Apply profile to base delay.
 */
function profileAdjustedDelay(
  baseDelay: number,
  profile: TypingProfile,
  progress: number
): number {
  switch (profile) {
    case "steady":
      return baseDelay * (0.95 + Math.random() * 0.1) // low variance
    case "fatigue": {
      const fatigue = 1 + progress * (0.15 * (1 + Math.random() * 0.3)) // 5–15%+ as progress grows
      return baseDelay * fatigue * (0.95 + Math.random() * 0.1)
    }
    case "burst": {
      // bursts: faster chars but occasional long pause handled elsewhere
      return baseDelay * (0.7 + Math.random() * 0.2)
    }
    case "micropause":
      return baseDelay * (0.85 + Math.random() * 0.3)
    default:
      return baseDelay
  }
}

/**
 * Compute per-character delays and a batch-level pause for punctuation/paragraphs/bursts.
 * With small batches (1-5 chars), this creates realistic human typing rhythm.
 */
export function buildDelayPlan(
  textSlice: string,
  baseCharDelayMs: number,
  profile: TypingProfile,
  globalProgress: number // 0..1 of overall text
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0

  // Pick speed range based on profile
  const range =
    profile === "burst"
      ? RANGES.fast
      : profile === "fatigue"
      ? RANGES.slow
      : RANGES.normal

  for (let i = 0; i < textSlice.length; i++) {
    const ch = textSlice[i]

    // Use range-based delay as primary, blend with duration target
    const rangeDelay = randInt(range.min, range.max)
    // Blend: 70% from natural range, 30% from duration target
    const blended = rangeDelay * 0.7 + baseCharDelayMs * 0.3

    const d = profileAdjustedDelay(blended, profile, globalProgress)
    charDelays.push(Math.max(50, Math.round(d))) // Min 50ms per char

    // Micro-pause triggers based on character
    if (ch === "." || ch === "!" || ch === "?") {
      batchPauseMs += randInt(MICRO_PAUSES.sentence.min, MICRO_PAUSES.sentence.max)
    } else if (ch === ",") {
      batchPauseMs += randInt(MICRO_PAUSES.comma.min, MICRO_PAUSES.comma.max)
    } else if (ch === " ") {
      // Small pause between words
      batchPauseMs += randInt(MICRO_PAUSES.wordBoundary.min, MICRO_PAUSES.wordBoundary.max)
    } else if (ch === "\n") {
      // Newline = thinking pause
      batchPauseMs += randInt(300, 600)
    }
  }

  // Additional heuristics based on content
  const words = textSlice.split(/\s+/)
  if (words.some((w) => w.length > 8)) {
    // Long words slow you down
    batchPauseMs += randInt(MICRO_PAUSES.longWord.min, MICRO_PAUSES.longWord.max)
  }
  if (textSlice.includes("\n\n")) {
    batchPauseMs += randInt(MICRO_PAUSES.paragraph.min, MICRO_PAUSES.paragraph.max)
  }

  // Profile-specific behaviors
  if (profile === "burst" && Math.random() < 0.25) {
    // Burst mode: occasional thinking pause
    batchPauseMs += randInt(MICRO_PAUSES.burstPause.min, MICRO_PAUSES.burstPause.max)
  }
  if (profile === "micropause" && Math.random() < 0.4) {
    // Micropause mode: frequent small hesitations
    batchPauseMs += randInt(100, 350)
  }

  return { charDelays, batchPauseMs }
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

