import { chooseBatchSize, createTypingBatch, MIN_INTERVAL_MS, TypingBatch } from "./batching"
import { buildDelayPlan, computeBaseCharDelayMs } from "./typing-delays"
import type { TypingProfile } from "@/types"

export interface MistakePlan {
  hasMistake: boolean
  deleteCount: number
}

export interface BatchPlan {
  batch: TypingBatch | null
  totalDelayMs: number
  perCharDelays: number[]
  batchPauseMs: number
  mistakePlan: MistakePlan
}

// Chance for a typo/backspace
const MISTAKE_CHANCE = 0.05 // 5%

export function planMistake(batchText: string): MistakePlan {
  if (batchText.length < 2) return { hasMistake: false, deleteCount: 0 }
  if (Math.random() > MISTAKE_CHANCE) return { hasMistake: false, deleteCount: 0 }
  // delete 1 char near end
  return { hasMistake: true, deleteCount: 1 }
}

/**
 * Build the next batch plan: slice text, compute delays, pauses, mistakes.
 */
export function buildBatchPlan(
  fullText: string,
  currentIndex: number,
  totalChars: number,
  durationMinutes: number,
  profile: TypingProfile
): BatchPlan {
  const batch = createTypingBatch(fullText, currentIndex, chooseBatchSize())
  if (!batch) {
    return {
      batch: null,
      totalDelayMs: 0,
      perCharDelays: [],
      batchPauseMs: 0,
      mistakePlan: { hasMistake: false, deleteCount: 0 },
    }
  }

  const baseCharDelay = computeBaseCharDelayMs(totalChars, durationMinutes)
  const progress = currentIndex / Math.max(1, totalChars)

  const { charDelays, batchPauseMs } = buildDelayPlan(
    batch.text,
    baseCharDelay,
    profile,
    progress
  )

  // Total delay = sum per-char + batch pause, but enforce minimum interval
  const perCharSum = charDelays.reduce((a, b) => a + b, 0)
  const totalDelayMs = Math.max(MIN_INTERVAL_MS, perCharSum + batchPauseMs)

  const mistakePlan = planMistake(batch.text)

  return {
    batch,
    totalDelayMs: Math.round(totalDelayMs),
    perCharDelays: charDelays,
    batchPauseMs,
    mistakePlan,
  }
}
