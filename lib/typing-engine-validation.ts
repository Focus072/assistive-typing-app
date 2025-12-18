import type { TypingProfile } from "@/types"
import type { DelayPlan } from "./typing-delays"

/**
 * Validate that an engine produces a signature matching its profile.
 */
export function validateEngineSignature(
  plan: DelayPlan,
  profile: TypingProfile,
  progress: number
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  if (plan.charDelays.length === 0) {
    errors.push("Delay plan must have at least one character delay")
    return { valid: false, errors, warnings }
  }

  const avgDelay = plan.charDelays.reduce((a, b) => b, 0) / plan.charDelays.length
  const variance = calculateVariance(plan.charDelays, avgDelay)
  const varianceCoefficient = variance / avgDelay

  switch (profile) {
    case "steady":
      // Steady should have low variance (5% range)
      if (varianceCoefficient > 0.1) {
        warnings.push(`Steady engine variance (${(varianceCoefficient * 100).toFixed(1)}%) is higher than expected (<10%)`)
      }
      // Should be consistent across progress
      break

    case "fatigue":
      // Fatigue should slow down as progress increases
      // This is harder to validate with a single batch, but we can check the multiplier
      // The fatigue multiplier should increase with progress
      if (progress > 0.5 && avgDelay < 150) {
        warnings.push(`Fatigue engine average delay (${avgDelay.toFixed(0)}ms) seems low for progress ${(progress * 100).toFixed(0)}%`)
      }
      break

    case "burst":
      // Burst should have lower average delays
      if (avgDelay > 150) {
        warnings.push(`Burst engine average delay (${avgDelay.toFixed(0)}ms) seems high for burst mode`)
      }
      // Should have occasional pauses
      if (plan.batchPauseMs === 0) {
        warnings.push("Burst engine should have occasional thinking pauses")
      }
      break

    case "micropause":
      // Micropause should have frequent small pauses
      if (plan.batchPauseMs < 50) {
        warnings.push("Micropause engine should have frequent small hesitations")
      }
      break

    case "typing-test":
      // Typing-test should have moderate variance (15% range)
      if (varianceCoefficient > 0.25) {
        warnings.push(`Typing-test engine variance (${(varianceCoefficient * 100).toFixed(1)}%) is higher than expected (<25%)`)
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Compare two engine signatures to ensure they're distinct.
 */
export function compareEngineSignatures(
  plan1: DelayPlan,
  plan2: DelayPlan,
  profile1: TypingProfile,
  profile2: TypingProfile
): { distinct: boolean; similarity: number; differences: string[] } {
  const differences: string[] = []

  if (profile1 === profile2) {
    return {
      distinct: true,
      similarity: 0,
      differences: ["Same profile, expected similarity"],
    }
  }

  const avg1 = plan1.charDelays.reduce((a, b) => a + b, 0) / plan1.charDelays.length
  const avg2 = plan2.charDelays.reduce((a, b) => a + b, 0) / plan2.charDelays.length

  const pauseRatio1 = plan1.batchPauseMs / (plan1.charDelays.length * avg1)
  const pauseRatio2 = plan2.batchPauseMs / (plan2.charDelays.length * avg2)

  // Calculate similarity (0 = completely different, 1 = identical)
  const avgSimilarity = 1 - Math.abs(avg1 - avg2) / Math.max(avg1, avg2)
  const pauseSimilarity = 1 - Math.abs(pauseRatio1 - pauseRatio2) / Math.max(pauseRatio1, pauseRatio2, 0.001)
  const similarity = (avgSimilarity + pauseSimilarity) / 2

  // Engines should be distinct if similarity < 0.7
  if (similarity > 0.7) {
    differences.push(`Engines are too similar (${(similarity * 100).toFixed(1)}% similarity)`)
  }

  if (Math.abs(avg1 - avg2) < 20) {
    differences.push(`Average delays are too close: ${avg1.toFixed(0)}ms vs ${avg2.toFixed(0)}ms`)
  }

  // Profile-specific checks
  if (profile1 === "burst" && profile2 === "steady" && avg1 > avg2) {
    differences.push("Burst engine should be faster than steady")
  }

  if (profile1 === "fatigue" && profile2 === "steady" && avg1 < avg2) {
    differences.push("Fatigue engine should be slower than steady (at high progress)")
  }

  return {
    distinct: similarity < 0.7,
    similarity,
    differences,
  }
}

/**
 * Calculate variance of a delay array.
 */
function calculateVariance(delays: number[], mean: number): number {
  if (delays.length === 0) return 0
  const squaredDiffs = delays.map(d => Math.pow(d - mean, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / delays.length
}

