import type { RandomState } from "./prng"

/**
 * Temporal state for tracking delay trends across batches.
 * Uses EMA (Exponential Moving Average) for low-frequency, smoothed drift.
 */
export interface TemporalState {
  delayEMA: number // Exponential moving average of delays
  driftFactor: number // Smoothed drift factor (-0.03 to +0.03)
  batchCount: number // Number of batches processed
}

/**
 * WPM tracking state for typing-test engine.
 * Tracks WPM drift to apply gentle corrections.
 */
export interface WPMState {
  cumulativeDelayMs: number // Total delay time so far
  cumulativeChars: number // Total characters typed so far
  wpmDriftEMA: number // EMA of WPM drift
  correctionFactor: number // Current correction factor (1.0 = no correction)
  batchCount: number // Number of batches processed
}

/**
 * Combined engine state for a job.
 */
export interface EngineState {
  randomState: RandomState
  temporalState: TemporalState
  wpmState?: WPMState // Only for typing-test profile
}

/**
 * Initialize temporal state for a new job.
 */
export function createTemporalState(): TemporalState {
  return {
    delayEMA: 0,
    driftFactor: 0,
    batchCount: 0,
  }
}

/**
 * Initialize WPM state for typing-test profile.
 */
export function createWPMState(): WPMState {
  return {
    cumulativeDelayMs: 0,
    cumulativeChars: 0,
    wpmDriftEMA: 0,
    correctionFactor: 1.0,
    batchCount: 0,
  }
}

/**
 * Update temporal state after processing a batch.
 * Uses EMA with low alpha (0.1-0.2) for slow, smooth changes.
 */
export function updateTemporalState(
  state: TemporalState,
  averageDelay: number,
  alpha: number = 0.15 // Low alpha for slow changes
): TemporalState {
  // Update EMA
  const newEMA = state.delayEMA === 0
    ? averageDelay // First batch: use current delay directly
    : alpha * averageDelay + (1 - alpha) * state.delayEMA

  // Calculate drift factor from EMA trend
  // If EMA is increasing, we're slowing down (positive drift)
  // If EMA is decreasing, we're speeding up (negative drift)
  let driftFactor = 0
  if (state.batchCount > 5) {
    // Only calculate drift after a few batches to avoid noise
    const trend = newEMA - state.delayEMA
    // Normalize trend to percentage (assume base delay around 150ms)
    const baseDelay = 150
    driftFactor = Math.max(-0.03, Math.min(0.03, trend / baseDelay))
  }

  return {
    delayEMA: newEMA,
    driftFactor,
    batchCount: state.batchCount + 1,
  }
}

/**
 * Update WPM state after processing a batch.
 * Tracks WPM drift and applies gentle corrections only after persistent drift.
 */
export function updateWPMState(
  state: WPMState,
  batchDelayMs: number,
  batchChars: number,
  targetWPM: number,
  alpha: number = 0.1 // Very low alpha for gentle corrections
): WPMState {
  // Update cumulative totals
  const newCumulativeDelayMs = state.cumulativeDelayMs + batchDelayMs
  const newCumulativeChars = state.cumulativeChars + batchChars

  // Calculate current WPM
  const currentWPM = newCumulativeChars > 0 && newCumulativeDelayMs > 0
    ? (newCumulativeChars / 5) / (newCumulativeDelayMs / 60000)
    : targetWPM

  // Calculate WPM drift
  const wpmDrift = (currentWPM - targetWPM) / targetWPM // As percentage

  // Update EMA of WPM drift
  const newWPMDriftEMA = state.wpmDriftEMA === 0
    ? wpmDrift
    : alpha * wpmDrift + (1 - alpha) * state.wpmDriftEMA

  // Apply gentle correction only after persistent drift (>5% for multiple batches)
  let correctionFactor = state.correctionFactor
  if (state.batchCount > 10 && Math.abs(newWPMDriftEMA) > 0.05) {
    // Gentle correction: ±1-2% adjustment
    const correction = Math.max(-0.02, Math.min(0.02, -newWPMDriftEMA * 0.3))
    correctionFactor = 1.0 + correction
  }

  return {
    cumulativeDelayMs: newCumulativeDelayMs,
    cumulativeChars: newCumulativeChars,
    wpmDriftEMA: newWPMDriftEMA,
    correctionFactor,
    batchCount: state.batchCount + 1,
  }
}

