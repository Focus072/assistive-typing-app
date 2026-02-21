/**
 * Admin utilities for authorization.
 * Admin emails are configured via the ADMIN_EMAILS environment variable (comma-separated).
 */

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(lower)
}
