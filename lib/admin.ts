/**
 * Admin utilities for authorization.
 * All email comparisons are case-insensitive so Galaljobah@gmail.com never locks out.
 */

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  if (lower === "galaljobah@gmail.com") return true
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(lower)
}
