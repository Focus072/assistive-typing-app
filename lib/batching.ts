import { hashString } from "./utils"

// Minimum delay between batches (ms) - lowered for human-like feel
export const MIN_INTERVAL_MS = 150

// Batch sizes for human-like typing.
// Smaller batches (2-5 chars) look more natural in Google Docs revision history
// — large jumps of 10-20 chars are an obvious detection signal.
// The trade-off is more API calls, but the inline batch loop absorbs the latency.
export const MIN_BATCH_SIZE = 2
export const MAX_BATCH_SIZE = 5

export interface TypingBatch {
  text: string
  startIndex: number
  endIndex: number
  hash: string
}

/**
 * Choose a batch size with weighted distribution (prefer 2-4 chars, less 1 or 5).
 * Uses weighted random selection, allowing natural repetition but reducing probability.
 *
 * When `upcomingText` is provided, the function becomes content-aware:
 * - If the next characters form a common short word (≤5 chars), prefer a batch size
 *   that captures the whole word so it lands in one batch (more natural).
 * - If the next character is whitespace, prefer smaller batches (natural pause point).
 * - Falls back to the weighted random distribution when no content signal applies.
 */
export function chooseBatchSize(
  _lastBatchSize?: number,
  randomFn: () => number = Math.random,
  upcomingText?: string
): number {
  // Content-aware hints when upcoming text is available
  if (upcomingText && upcomingText.length >= 2) {
    // If starting at whitespace, prefer a small batch (natural pause point)
    if (/^\s/.test(upcomingText)) {
      return randomFn() < 0.7 ? 2 : 3
    }

    // Check if the upcoming text starts with a short word (letters up to next space/end)
    const wordMatch = upcomingText.match(/^[a-zA-Z]+/)
    if (wordMatch) {
      const wordLen = wordMatch[0].length
      // If the word fits in our batch range (2-5 chars), prefer capturing it whole
      // ~65% chance to use the word-aligned size, 35% fall through to random
      if (wordLen >= 2 && wordLen <= 5 && randomFn() < 0.65) {
        return wordLen
      }
    }
  }

  // Default: weighted random distribution. Average ≈ 3.3 chars.
  // Small batches look like real keystrokes in Google Docs revision history.
  // Weighted toward 3-4 chars; occasional 2 or 5 for natural variation.
  const sizes   = [2,    3,    4,    5   ]
  const weights = [0.15, 0.40, 0.30, 0.15]

  const r = randomFn()
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]
    if (r <= cumulative) return sizes[i]
  }
  return 3 // fallback
}

/**
 * Build a batch of text from currentIndex with the given batchSize.
 * Returns null when no text remains.
 */
export function createTypingBatch(
  text: string,
  startIndex: number,
  batchSize: number = chooseBatchSize()
): TypingBatch | null {
  if (startIndex >= text.length) return null

  const endIndex = Math.min(startIndex + batchSize, text.length)
  const batchText = text.slice(startIndex, endIndex)
  const hash = hashString(`${batchText}-${startIndex}`)

  return {
    text: batchText,
    startIndex,
    endIndex,
    hash,
  }
}
