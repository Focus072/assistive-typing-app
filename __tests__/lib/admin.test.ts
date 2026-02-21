import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isAdminEmail } from '@/lib/admin'

describe('isAdminEmail', () => {
  const originalEnv = process.env.ADMIN_EMAILS

  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'admin@example.com, boss@company.org'
  })

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv
  })

  it('returns false for null', () => {
    expect(isAdminEmail(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isAdminEmail(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isAdminEmail('')).toBe(false)
  })

  it('returns false for an email not in ADMIN_EMAILS', () => {
    expect(isAdminEmail('user@example.com')).toBe(false)
  })

  it('returns true for an email in ADMIN_EMAILS', () => {
    expect(isAdminEmail('admin@example.com')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isAdminEmail('ADMIN@EXAMPLE.COM')).toBe(true)
    expect(isAdminEmail('Boss@Company.Org')).toBe(true)
  })

  it('returns false when ADMIN_EMAILS is empty', () => {
    process.env.ADMIN_EMAILS = ''
    expect(isAdminEmail('admin@example.com')).toBe(false)
  })
})
