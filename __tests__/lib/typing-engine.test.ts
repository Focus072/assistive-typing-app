import { describe, it, expect } from 'vitest'
import { validateEngineInputs } from '@/lib/typing-engine'

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
