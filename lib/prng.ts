/**
 * Simple Linear Congruential Generator (LCG) for seeded random number generation.
 * This ensures non-repeatable but consistent randomness within a job.
 */

export interface RandomState {
  seed: number // Original seed for reference
  state: number // Current PRNG state
}

/**
 * Create a new PRNG state from a seed.
 * Seed should be unique per job/run.
 */
export function createPRNG(seed: number): RandomState {
  // Use a simple hash to ensure seed is in valid range
  const normalizedSeed = seed % 2147483647
  return {
    seed: normalizedSeed,
    state: normalizedSeed === 0 ? 1 : normalizedSeed, // Avoid zero state
  }
}

/**
 * Generate next random number in [0, 1) range.
 * Uses LCG algorithm: (a * state + c) mod m
 */
export function nextRandom(state: RandomState): number {
  // LCG parameters (same as used in many standard libraries)
  const a = 1664525
  const c = 1013904223
  const m = 2147483647 // 2^31 - 1

  state.state = (a * state.state + c) % m
  return state.state / m
}

/**
 * Generate random integer in [min, max] range (inclusive).
 */
export function randomInt(state: RandomState, min: number, max: number): number {
  return Math.floor(nextRandom(state) * (max - min + 1)) + min
}

/**
 * Generate seed from job ID and timestamp.
 * This ensures each job gets a unique seed.
 */
export function generateSeed(jobId: string): number {
  // Simple hash of jobId
  let hash = 0
  for (let i = 0; i < jobId.length; i++) {
    const char = jobId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Combine with current time (milliseconds since epoch)
  const timestamp = Date.now()
  
  // Combine hash and timestamp
  return Math.abs(hash + timestamp)
}

