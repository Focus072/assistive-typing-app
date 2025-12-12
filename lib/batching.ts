import { hashString } from "./utils"

// Minimum delay between batches (ms) - lowered for human-like feel
export const MIN_INTERVAL_MS = 150

// Batch sizes for human-like typing (1-5 chars per batch)
export const MIN_BATCH_SIZE = 1
export const MAX_BATCH_SIZE = 5

export interface TypingBatch {
  text: string
  startIndex: number
  endIndex: number
  hash: string
}

/**
 * Choose a batch size between 10-25 to vary rhythm.
 */
export function chooseBatchSize(): number {
  return Math.floor(Math.random() * (MAX_BATCH_SIZE - MIN_BATCH_SIZE + 1)) + MIN_BATCH_SIZE
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
