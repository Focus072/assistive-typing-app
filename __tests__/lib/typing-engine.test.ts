import { describe, it, expect } from 'vitest'
import { buildBatchPlan, validateEngineInputs } from '@/lib/typing-engine'
import { createPRNG } from '@/lib/prng'
import { createTemporalState, createWPMState } from '@/lib/typing-state'

describe('validateEngineInputs', () => {
  it('returns valid for a standard profile without testWPM', () => {
    const result = validateEngineInputs('steady')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns valid for typing-test profile with testWPM', () => {
    const result = validateEngineInputs('typing-test', 60)
    expect(result.valid).toBe(true)
  })

  it('returns error when typing-test profile is missing testWPM', () => {
    const result = validateEngineInputs('typing-test')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('testWPM is required')
  })

  it('returns error when testWPM is below minimum (1)', () => {
    const result = validateEngineInputs('typing-test', 0)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('between 1 and 300')
  })

  it('returns error when testWPM exceeds maximum (300)', () => {
    const result = validateEngineInputs('typing-test', 301)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('between 1 and 300')
  })

  it('returns error for an invalid profile string', () => {
    const result = validateEngineInputs('turbo' as never)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid typing profile')
  })

  it('accepts all valid profiles', () => {
    const profiles = ['steady', 'fatigue', 'burst', 'micropause'] as const
    for (const profile of profiles) {
      expect(validateEngineInputs(profile).valid).toBe(true)
    }
  })
})

describe('buildBatchPlan state wiring', () => {
  const text = 'The quick brown fox jumps over the lazy dog.'

  it('produces deterministic output from identical engine state', () => {
    const seedA = createPRNG(12345)
    const seedB = createPRNG(12345)

    const planA = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'steady',
      undefined,
      {
        jobId: 'job-deterministic',
        engineState: {
          randomState: seedA,
          temporalState: createTemporalState(),
        },
      }
    )

    const planB = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'steady',
      undefined,
      {
        jobId: 'job-deterministic',
        engineState: {
          randomState: seedB,
          temporalState: createTemporalState(),
        },
      }
    )

    expect(planA.batch?.text).toBe(planB.batch?.text)
    expect(planA.perCharDelays).toEqual(planB.perCharDelays)
    expect(planA.batchPauseMs).toBe(planB.batchPauseMs)
    expect(planA.mistakePlan).toEqual(planB.mistakePlan)
  })

  it('advances temporal and random state without mutating input state', () => {
    const inputState = {
      randomState: createPRNG(99),
      temporalState: createTemporalState(),
    }

    const plan = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'burst',
      undefined,
      {
        jobId: 'job-state-advance',
        engineState: inputState,
      }
    )

    expect(plan.engineState.temporalState.batchCount).toBe(1)
    expect(plan.engineState.lastBatchSize).toBe(plan.batch?.text.length)
    expect(plan.engineState.randomState.state).not.toBe(inputState.randomState.state)
    expect(inputState.temporalState.batchCount).toBe(0)
  })

  it('updates WPM state for typing-test profile', () => {
    const plan = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'typing-test',
      60,
      {
        jobId: 'job-typing-test',
        engineState: {
          randomState: createPRNG(4242),
          temporalState: createTemporalState(),
          wpmState: createWPMState(),
        },
      }
    )

    expect(plan.engineState.wpmState).toBeDefined()
    expect(plan.engineState.wpmState?.batchCount).toBe(1)
    expect(plan.engineState.wpmState?.cumulativeChars).toBeGreaterThan(0)
  })

  it('transitions burst phase from burst to settle', () => {
    const plan = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'burst',
      undefined,
      {
        jobId: 'job-burst-transition',
        engineState: {
          randomState: createPRNG(7),
          temporalState: createTemporalState(),
          burstState: {
            phase: 'burst',
            charsUntilTransition: 1,
            pauseCooldownBatches: 0,
          },
        },
      }
    )

    expect(plan.engineState.burstState).toBeDefined()
    expect(plan.engineState.burstState?.phase).toBe('settle')
    expect(plan.batchPauseMs).toBeGreaterThanOrEqual(350)
  })

  it('uses slower delays in burst settle phase', () => {
    const burstPlan = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'burst',
      undefined,
      {
        jobId: 'job-burst-phase-burst',
        engineState: {
          randomState: createPRNG(123),
          temporalState: createTemporalState(),
          burstState: {
            phase: 'burst',
            charsUntilTransition: 50,
            pauseCooldownBatches: 0,
          },
        },
      }
    )

    const settlePlan = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'burst',
      undefined,
      {
        jobId: 'job-burst-phase-settle',
        engineState: {
          randomState: createPRNG(123),
          temporalState: createTemporalState(),
          burstState: {
            phase: 'settle',
            charsUntilTransition: 50,
            pauseCooldownBatches: 0,
          },
        },
      }
    )

    const burstAvg = burstPlan.perCharDelays.reduce((a, b) => a + b, 0) / burstPlan.perCharDelays.length
    const settleAvg = settlePlan.perCharDelays.reduce((a, b) => a + b, 0) / settlePlan.perCharDelays.length

    expect(settleAvg).toBeGreaterThan(burstAvg)
  })

  it('transitions fatigue phase from build to recovery', () => {
    const plan = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'fatigue',
      undefined,
      {
        jobId: 'job-fatigue-transition',
        engineState: {
          randomState: createPRNG(17),
          temporalState: createTemporalState(),
          fatigueState: {
            phase: 'build',
            charsUntilTransition: 1,
            fatigueLevel: 0.6,
          },
        },
      }
    )

    expect(plan.engineState.fatigueState).toBeDefined()
    expect(plan.engineState.fatigueState?.phase).toBe('recovery')
    expect(plan.batchPauseMs).toBeGreaterThanOrEqual(180)
  })

  it('uses slower delays in fatigue build phase than recovery', () => {
    const buildPlan = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'fatigue',
      undefined,
      {
        jobId: 'job-fatigue-build',
        engineState: {
          randomState: createPRNG(222),
          temporalState: createTemporalState(),
          fatigueState: {
            phase: 'build',
            charsUntilTransition: 40,
            fatigueLevel: 0.8,
          },
        },
      }
    )

    const recoveryPlan = buildBatchPlan(
      text,
      0,
      text.length,
      5,
      'fatigue',
      undefined,
      {
        jobId: 'job-fatigue-recovery',
        engineState: {
          randomState: createPRNG(222),
          temporalState: createTemporalState(),
          fatigueState: {
            phase: 'recovery',
            charsUntilTransition: 40,
            fatigueLevel: 0.8,
          },
        },
      }
    )

    const buildAvg = buildPlan.perCharDelays.reduce((a, b) => a + b, 0) / buildPlan.perCharDelays.length
    const recoveryAvg = recoveryPlan.perCharDelays.reduce((a, b) => a + b, 0) / recoveryPlan.perCharDelays.length

    expect(buildAvg).toBeGreaterThan(recoveryAvg)
  })
})
