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
 * Choose a batch size with weighted distribution (prefer 2-4 chars, less 1 or 5).
 * Uses weighted random selection, allowing natural repetition but reducing probability.
 */
export function chooseBatchSize(lastBatchSize?: number): number {
  // Weighted distribution: [1: 0.1, 2: 0.3, 3: 0.4, 4: 0.15, 5: 0.05]
  const weights = [0.1, 0.3, 0.4, 0.15, 0.05]
  
  // Apply subtle momentum: if last batch was small, slightly prefer larger
  let adjustedWeights = [...weights]
  if (lastBatchSize !== undefined && lastBatchSize <= 2) {
    // Slightly increase probability of larger batches
    adjustedWeights[2] += 0.1 // Increase weight for size 3
    adjustedWeights[3] += 0.05 // Increase weight for size 4
    // Normalize
    const sum = adjustedWeights.reduce((a, b) => a + b, 0)
    adjustedWeights = adjustedWeights.map(w => w / sum)
  } else if (lastBatchSize !== undefined && lastBatchSize >= 4) {
    // Slightly increase probability of smaller batches
    adjustedWeights[1] += 0.05 // Increase weight for size 2
    adjustedWeights[2] += 0.05 // Increase weight for size 3
    // Normalize
    const sum = adjustedWeights.reduce((a, b) => a + b, 0)
    adjustedWeights = adjustedWeights.map(w => w / sum)
  }
  
  // Weighted random selection
  const r = Math.random()
  let cumulative = 0
  for (let i = 0; i < adjustedWeights.length; i++) {
    cumulative += adjustedWeights[i]
    if (r <= cumulative) {
      return i + 1 // Return size (1-5)
    }
  }
  
  // Fallback (shouldn't happen)
  return 3
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
