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
 */
export function chooseBatchSize(_lastBatchSize?: number, randomFn: () => number = Math.random): number {
  // Discrete sizes and their weights. Average ≈ 3.3 chars.
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
