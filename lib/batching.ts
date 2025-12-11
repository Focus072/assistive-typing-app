import { hashString } from "./utils"

export const MIN_INTERVAL_MS = 500
export const MIN_BATCH_SIZE = 10
export const MAX_BATCH_SIZE = 25

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
