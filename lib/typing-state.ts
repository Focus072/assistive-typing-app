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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Burst engine phase state.
 * Enables runs of fast typing followed by short settle periods.
 */
export type BurstPhase = "burst" | "settle"

export interface BurstState {
  phase: BurstPhase
  charsUntilTransition: number
  pauseCooldownBatches: number
}

/**
 * Fatigue engine phase state.
 * Alternates between buildup and short recovery windows.
 */
export type FatiguePhase = "build" | "recovery"

export interface FatigueState {
  phase: FatiguePhase
  charsUntilTransition: number
  fatigueLevel: number // 0..1 intensity used to scale fatigue behavior
}

/**
 * Steady engine phase state.
 * Creates subtle long-window pace drift without abrupt changes.
 */
export type SteadyPhase = "focus" | "relaxed"

export interface SteadyState {
  phase: SteadyPhase
  charsUntilTransition: number
  paceMultiplier: number // ~0.95..1.05 to keep rhythm subtle
}

/**
 * Combined engine state for a job.
 */
export interface EngineState {
  randomState: RandomState
  temporalState: TemporalState
  wpmState?: WPMState // Only for typing-test profile
  burstState?: BurstState // Only for burst profile
  fatigueState?: FatigueState // Only for fatigue profile
  steadyState?: SteadyState // Only for steady profile
  lastBatchSize?: number // Previous batch size for momentum-aware batching
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

  // Apply bounded, smooth correction after persistent drift.
  // Positive drift => typing too fast => increase delays (correctionFactor > 1).
  // Negative drift => typing too slow => decrease delays (correctionFactor < 1).
  // Wait for ~8 batches (~40 chars) to build a stable EMA before correcting.
  // Early batches have high variance that would cause overcorrection.
  const MIN_BATCHES_FOR_CORRECTION = 8
  // Ignore drift < 2%: falls within normal human rhythm variance (noise floor).
  const DRIFT_DEADBAND = 0.02
  // Start correcting at 4% drift: meaningful but not yet disruptive.
  const DRIFT_ACTIVATION = 0.04
  // Max ±6% speed adjustment: enough to converge without perceptible lurching.
  const MAX_CORRECTION_OFFSET = 0.06
  // Move at most 0.4% per batch toward the target: gradual enough to be imperceptible.
  const MAX_CORRECTION_STEP = 0.004

  let correctionFactor = state.correctionFactor
  if (state.batchCount >= MIN_BATCHES_FOR_CORRECTION) {
    if (Math.abs(newWPMDriftEMA) <= DRIFT_DEADBAND) {
      // Near target: slowly decay correction back toward neutral.
      const deltaToNeutral = 1.0 - correctionFactor
      correctionFactor += clamp(deltaToNeutral, -MAX_CORRECTION_STEP, MAX_CORRECTION_STEP)
    } else if (Math.abs(newWPMDriftEMA) >= DRIFT_ACTIVATION) {
      const desiredCorrectionOffset = clamp(newWPMDriftEMA * 0.35, -MAX_CORRECTION_OFFSET, MAX_CORRECTION_OFFSET)
      const desiredFactor = 1.0 + desiredCorrectionOffset
      const delta = desiredFactor - correctionFactor
      correctionFactor += clamp(delta, -MAX_CORRECTION_STEP, MAX_CORRECTION_STEP)
    }
  }
  correctionFactor = clamp(correctionFactor, 1 - MAX_CORRECTION_OFFSET, 1 + MAX_CORRECTION_OFFSET)

  return {
    cumulativeDelayMs: newCumulativeDelayMs,
    cumulativeChars: newCumulativeChars,
    wpmDriftEMA: newWPMDriftEMA,
    correctionFactor,
    batchCount: state.batchCount + 1,
  }
}

