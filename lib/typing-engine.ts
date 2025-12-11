import type { TypingProfile } from "@/types"

const BATCH_SIZE = 20
const MIN_INTERVAL_MS = 500

export interface TypingTiming {
  delay: number
  batchSize: number
}

export function calculateTypingTiming(
  totalChars: number,
  durationMinutes: number,
  profile: TypingProfile,
  currentIndex: number = 0,
  throttleDelay: number = MIN_INTERVAL_MS
): TypingTiming {
  const remainingChars = totalChars - currentIndex
  if (remainingChars <= 0) {
    return { delay: 0, batchSize: 0 }
  }

  const durationMs = durationMinutes * 60 * 1000
  const baseDelay = Math.max(
    throttleDelay,
    (durationMs / totalChars) * BATCH_SIZE
  )

  let delay = baseDelay
  let batchSize = BATCH_SIZE

  // Apply profile-specific adjustments
  switch (profile) {
    case "steady":
      // Uniform pace with slight variation
      delay = baseDelay * (0.9 + Math.random() * 0.2)
      break

    case "fatigue":
      // Slows over time
      const progress = currentIndex / totalChars
      const fatigueMultiplier = 1 + progress * 0.5
      delay = baseDelay * fatigueMultiplier * (0.9 + Math.random() * 0.2)
      break

    case "burst":
      // Short fast sessions with longer pauses
      if (Math.random() < 0.3) {
        // 30% chance of longer pause
        delay = baseDelay * (2 + Math.random() * 2)
      } else {
        delay = baseDelay * (0.7 + Math.random() * 0.3)
      }
      break

    case "micropause":
      // Frequent tiny breaks
      if (Math.random() < 0.4) {
        // 40% chance of micro-pause
        delay = baseDelay * (1.2 + Math.random() * 0.5)
      } else {
        delay = baseDelay * (0.8 + Math.random() * 0.3)
      }
      break
  }

  // Add word-boundary pauses
  if (Math.random() < 0.1) {
    // 10% chance of word-break pause
    delay *= 1.5
  }

  // Ensure minimum delay
  delay = Math.max(delay, throttleDelay)

  return { delay: Math.round(delay), batchSize }
}

export function shouldAddCorrection(): boolean {
  // 5-10% chance of correction
  return Math.random() < 0.075
}

export function simulateCorrection(text: string): string {
  // Simple correction: backspace last char and retype
  if (text.length <= 1) return text
  
  const backspace = "\b"
  const lastChar = text[text.length - 1]
  return text.slice(0, -1) + backspace + lastChar
}


