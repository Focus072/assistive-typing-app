import { hashString } from "./utils"

// Minimum delay between batches (ms) - lowered for human-like feel
export const MIN_INTERVAL_MS = 150

// Batch sizes for human-like typing.
// Larger batches (5-20 chars) are necessary to absorb Google Docs API latency
// (~500-1500ms per call) without it dominating the inter-batch delay and
// causing actual WPM to fall far below the configured target.
export const MIN_BATCH_SIZE = 5
export const MAX_BATCH_SIZE = 20

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
  // Discrete sizes and their weights. Average ≈ 11 chars.
  // Large enough that Google Docs API latency (~500-1500ms) is absorbed by the
  // inter-batch delay rather than blowing the WPM budget.
  const sizes   = [5,    8,    12,   15,   20  ]
  const weights = [0.15, 0.30, 0.30, 0.20, 0.05]

  const r = randomFn()
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]
    if (r <= cumulative) return sizes[i]
  }
  return 12 // fallback
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
