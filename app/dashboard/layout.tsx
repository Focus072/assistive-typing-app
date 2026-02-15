"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SignOutButton } from "@/components/SignOutButton"
import { useEffect, useState, createContext, useContext } from "react"

// Check if user is admin (client-side check)
function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  // Always allow galaljobah@gmail.com as admin (independent of env var)
  if (email === "galaljobah@gmail.com") {
    return true
  }
  // In production, you might want to check ADMIN_EMAILS env var
  // but for client-side, we'll just check the hardcoded admin email
  return false
}

// Theme Context
interface DashboardThemeContextType {
  isDark: boolean
  theme: "dark" | "light" | "system"
  setTheme: (theme: "dark" | "light" | "system") => void
}

const DashboardThemeContext = createContext<DashboardThemeContextType | undefined>(undefined)

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext)
  // Return default values when used outside DashboardLayout (e.g., in toast notifications)
  if (!context) {
    // Default to light theme when outside dashboard context
    const isDark = typeof window !== "undefined" 
      ? window.matchMedia("(prefers-color-scheme: dark)").matches 
      : false
    return {
      isDark,
      theme: "system" as const,
      setTheme: () => {}, // No-op when outside context
    }
  }
  return context
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [theme, setThemeState] = useState<"dark" | "light" | "system">("dark")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  // Load theme from localStorage (defer setState to avoid "state update on unmounted component" in Next.js 16)
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | "system" | null
    if (savedTheme) {
      const id = setTimeout(() => setThemeState(savedTheme), 0)
      return () => clearTimeout(id)
    }
  }, [])

  // Determine if dark mode based on theme and system preference
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  const setTheme = (newTheme: "dark" | "light" | "system") => {
    setThemeState(newTheme)
    localStorage.setItem("theme", newTheme)
  }

  // Show loading only on initial load (no session yet). When we have a session, refetches (e.g. updateSession) can briefly set status to "loading" – don’t show full-screen spinner then to avoid flicker.
  if (status === "loading" && !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-300 rounded-full animate-spin border-t-black" />
          <span className="text-black text-sm font-medium">Loading...</span>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (redirect will happen)
  if (!session) {
    return null
  }

  return (
    <DashboardThemeContext.Provider value={{ isDark, theme, setTheme }}>
      <div className={`min-h-screen relative flex flex-col ${
        isDark ? "bg-black text-white" : "bg-gray-50 text-black"
      }`}>
        {/* Subtle background to match landing aesthetic */}
        {isDark ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,1)_0%,_transparent_100%)] pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/50 to-white pointer-events-none" />
        )}

        {/* Header - Fixed */}
        <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${
          isDark ? "border-[#333] bg-black/80" : "border-black/10 bg-white/95"
        }`}>
          <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 md:px-6 gap-4">
            {/* Left: Logo */}
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 md:gap-3 group flex-shrink-0 min-w-0"
              aria-label="Dashboard home"
            >
              <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center shadow-sm transition-all flex-shrink-0 ${
                isDark
                  ? "bg-white/10 group-hover:bg-white/20"
                  : "bg-black text-white group-hover:bg-black/90"
              }`}>
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="hidden sm:block min-w-0">
                <h1 className={`text-base md:text-lg font-semibold truncate ${
                  isDark ? "text-white" : "text-black"
                }`}>
                  typingisboring
                </h1>
                <p className={`text-xs hidden md:block truncate ${
                  isDark ? "text-white/50" : "text-black/60"
                }`}>
                  Natural typing for Google Docs
                </p>
              </div>
            </Link>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* Home Link */}
              <Link 
                href="/" 
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isDark
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-black/70 hover:text-black hover:bg-black/5"
                }`}
                aria-label="Go to home page"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-sm">Home</span>
              </Link>
              
              {/* History Link */}
              <Link 
                href="/dashboard/history" 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isDark
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-black/70 hover:text-black hover:bg-black/5"
                }`}
                aria-label="View typing history"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm hidden sm:inline">History</span>
              </Link>

              {/* Account Link */}
              <Link 
                href="/dashboard/account" 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isDark
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-black/70 hover:text-black hover:bg-black/5"
                }`}
                aria-label="Account and subscription"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm hidden sm:inline">Account</span>
              </Link>
              
              {/* Admin Link - Only show for admin users */}
              {session?.user?.email && isAdmin(session.user.email) && (
                <Link 
                  href="/admin" 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isDark
                      ? "text-white/70 hover:text-white hover:bg-white/10 border border-yellow-500/30"
                      : "text-black/70 hover:text-black hover:bg-black/5 border border-yellow-500/30"
                  }`}
                  aria-label="Admin Dashboard"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm hidden sm:inline">Admin</span>
                </Link>
              )}
              
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  isDark
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-black/5 hover:bg-black/10 text-black"
                }`}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              
              {/* Dashboard - same size/shape/style as Sign Out */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 text-sm font-medium transition-all"
                aria-label="Dashboard"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </Link>
              {/* Sign Out */}
              <SignOutButton />
            </div>
          </div>
        </header>
      
      {/* Main content - Mobile Optimized */}
      <main className="relative z-10 container mx-auto px-4 md:px-6 py-4 md:py-8 pb-8 min-h-[calc(100vh-8rem)]">
        {children}
      </main>
      </div>
    </DashboardThemeContext.Provider>
  )
}
