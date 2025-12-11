import type { TypingProfile } from "@/types"

export interface DelayPlan {
  charDelays: number[] // per-character delays
  batchPauseMs: number // extra pause after batch (punctuation/micro-pause)
}

// Base character delay ranges (ms)
const RANGES = {
  normal: { min: 60, max: 220 },
  fast: { min: 30, max: 100 },
  slow: { min: 120, max: 300 },
}

// Micro-pause ranges (ms)
const MICRO_PAUSES = {
  sentence: { min: 400, max: 900 }, // . ! ?
  comma: { min: 200, max: 350 }, // ,
  longWord: { min: 200, max: 400 }, // word length > 10
  paragraph: { min: 800, max: 1500 }, // \n\n
  burstPause: { min: 500, max: 900 }, // burst thinking pause
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
 * - baseCharDelayMs: derived from duration control (duration / totalChars)
 */
export function buildDelayPlan(
  textSlice: string,
  baseCharDelayMs: number,
  profile: TypingProfile,
  globalProgress: number // 0..1 of overall text
): DelayPlan {
  const charDelays: number[] = []
  let batchPauseMs = 0

  // pick a speed range baseline
  const range =
    profile === "burst"
      ? RANGES.fast
      : profile === "steady"
      ? RANGES.normal
      : profile === "fatigue"
      ? RANGES.normal
      : RANGES.normal

  for (let i = 0; i < textSlice.length; i++) {
    const ch = textSlice[i]
    const wordProgress = globalProgress // reuse global for simplicity

    // derive a base: mix between computed baseCharDelayMs and range
    const rangeDelay = randInt(range.min, range.max)
    const blended = (baseCharDelayMs * 0.6 + rangeDelay * 0.4)

    let d = profileAdjustedDelay(blended, profile, wordProgress)
    charDelays.push(Math.max(20, Math.round(d)))

    // Micro-pause triggers (only once per batch, we accumulate in batchPauseMs)
    if (ch === "." || ch === "!" || ch === "?") {
      batchPauseMs += randInt(MICRO_PAUSES.sentence.min, MICRO_PAUSES.sentence.max)
    } else if (ch === ",") {
      batchPauseMs += randInt(MICRO_PAUSES.comma.min, MICRO_PAUSES.comma.max)
    }
  }

  // Additional heuristics based on content
  const words = textSlice.split(/\s+/)
  if (words.some((w) => w.length > 10)) {
    batchPauseMs += randInt(MICRO_PAUSES.longWord.min, MICRO_PAUSES.longWord.max)
  }
  if (textSlice.includes("\n\n")) {
    batchPauseMs += randInt(MICRO_PAUSES.paragraph.min, MICRO_PAUSES.paragraph.max)
  }

  // Burst profile: chance of extra pause after batch
  if (profile === "burst" && Math.random() < 0.35) {
    batchPauseMs += randInt(MICRO_PAUSES.burstPause.min, MICRO_PAUSES.burstPause.max)
  }

  return { charDelays, batchPauseMs }
}

/**
 * Compute baseCharDelay from total duration target.
 */
export function computeBaseCharDelayMs(totalChars: number, durationMinutes: number): number {
  if (totalChars <= 0) return 100
  const durationMs = durationMinutes * 60 * 1000
  return Math.max(30, durationMs / totalChars)
}

