/**
 * Utility to determine if all pages should be accessible (local development)
 * vs only public pages (production)
 */

export function isLocalDevelopment(): boolean {
  // Check NODE_ENV first
  if (process.env.NODE_ENV === "development") {
    return true
  }
  
  // Also check for explicit local dev flag
  if (process.env.ALLOW_ALL_PAGES === "true") {
    return true
  }
  
  return false
}

/**
 * Check if a page should be accessible in production
 * Returns true if:
 * - We're in local development, OR
 * - The page is in the allowed public list (home, pricing, how-it-works, updates, privacy, terms, cookies)
 */
export function isPageAccessible(pathname: string): boolean {
  // Always allow in local development
  if (isLocalDevelopment()) {
    return true
  }
  
  // In production, allow public pages
  const allowedPaths = [
    "/", // Home page
    "/pricing",
    "/how-it-works",
    "/updates",
    "/launch",
    "/privacy",
    "/terms",
    "/cookies",
    "/api", // API routes should always be accessible
  ]
  
  // Check if pathname starts with any allowed path
  return allowedPaths.some(path => pathname === path || pathname.startsWith(path))
}
