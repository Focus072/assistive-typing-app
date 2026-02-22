"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import { SignOutButton } from "@/components/SignOutButton"
import { useEffect, useState } from "react"
import { DashboardThemeContext } from "./theme-context"
import { DashboardSidebar } from "@/components/DashboardSidebar"


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setThemeState] = useState<"dark" | "light" | "system">("dark")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

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
      <div className={`min-h-screen relative flex flex-col max-w-full overflow-x-hidden ${
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

        {/* Header - Hamburger on mobile, full nav on md+ */}
        <header className={`sticky top-0 z-50 border-b backdrop-blur-md w-full max-w-full overflow-x-hidden ${
          isDark ? "border-[#333] bg-black/80" : "border-black/10 bg-white/95"
        }`}>
          <div className="w-full max-w-full flex flex-nowrap h-14 md:h-20 items-center justify-between px-4 md:px-6 gap-2 overflow-x-hidden">
            {/* Left: Logo */}
            <Link 
              href="/dashboard" 
              className="flex items-center gap-1.5 md:gap-3 group flex-shrink-0 min-w-0"
              aria-label="Dashboard home"
            >
              <div className={`w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center shadow-sm transition-all flex-shrink-0 ${
                isDark
                  ? "bg-white/10 group-hover:bg-white/20"
                  : "bg-black text-white group-hover:bg-black/90"
              }`}>
                <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            
            {/* Mobile/tablet: Hamburger button (show until lg so 768px tablet gets it) */}
            <div className="flex items-center gap-2 lg:hidden flex-shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                  isDark
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-black/5 hover:bg-black/10 text-black"
                }`}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Desktop: Full nav (lg and up only) */}
            <div className="hidden lg:flex flex-nowrap items-center gap-1 xl:gap-3 flex-shrink-0 min-w-0">
              <Link 
                href="/" 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-black/70 hover:text-black hover:bg-black/5"
                }`}
                aria-label="Go to home page"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-sm">Home</span>
              </Link>
              <Link 
                href="/dashboard/history" 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-black/70 hover:text-black hover:bg-black/5"
                }`}
                aria-label="View typing history"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">History</span>
              </Link>
              <Link 
                href="/dashboard/account" 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-black/70 hover:text-black hover:bg-black/5"
                }`}
                aria-label="Account and subscription"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm">Account</span>
              </Link>
              {session?.user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${
                    isDark ? "text-white/70 hover:text-white hover:bg-white/10 border-yellow-500/30" : "text-black/70 hover:text-black hover:bg-black/5 border-yellow-500/30"
                  }`}
                  aria-label="Admin Dashboard"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm">Admin</span>
                </Link>
              )}
              {session?.user?.planTier === "UNLIMITED" && (
                <Link
                  href="/dashboard/ai-chat"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${
                    isDark
                      ? "text-violet-300 hover:text-violet-200 hover:bg-violet-500/10 border-violet-500/30"
                      : "text-violet-700 hover:text-violet-800 hover:bg-violet-50 border-violet-300/50"
                  }`}
                  aria-label="AI Writing Assistant"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="text-sm">AI Chat</span>
                </Link>
              )}
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                  isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-black"
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
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Mobile slide-out menu - portaled to body so no parent opacity/stacking affects it */}
        {mobileMenuOpen && typeof document !== "undefined" && createPortal(
          <>
            <div
              className="fixed inset-0 z-[60] lg:hidden"
              style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              className={`fixed top-0 right-0 z-[70] w-full max-w-[280px] h-full shadow-2xl lg:hidden flex flex-col border-l ${isDark ? "border-white/10" : "border-black/10"}`}
              style={{ backgroundColor: isDark ? "#000000" : "#ffffff" }}
              role="dialog"
              aria-label="Navigation menu"
            >
              {/* Opaque background layer - guarantees no see-through */}
              <div
                className="absolute inset-0 -z-10"
                style={{ backgroundColor: isDark ? "#000000" : "#ffffff" }}
                aria-hidden="true"
              />
                <div className="flex items-center justify-between p-4 border-b border-white/10 relative z-10">
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-black"}`}>Menu</span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg -mr-2 ${
                      isDark ? "text-white/70 hover:bg-white/10" : "text-black/70 hover:bg-black/5"
                    }`}
                    aria-label="Close menu"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <nav className="flex flex-col p-4 gap-1 overflow-y-auto relative z-10">
                  <Link href="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isDark ? "text-white/80 hover:bg-white/10" : "text-black/80 hover:bg-black/5"
                  }`} onClick={() => setMobileMenuOpen(false)}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Home
                  </Link>
                  <Link href="/dashboard/history" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isDark ? "text-white/80 hover:bg-white/10" : "text-black/80 hover:bg-black/5"
                  }`} onClick={() => setMobileMenuOpen(false)}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    History
                  </Link>
                  <Link href="/dashboard/account" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isDark ? "text-white/80 hover:bg-white/10" : "text-black/80 hover:bg-black/5"
                  }`} onClick={() => setMobileMenuOpen(false)}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Account
                  </Link>
                  {session?.user?.role === 'ADMIN' && (
                    <Link href="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors border border-yellow-500/40 ${
                      isDark ? "text-white/80 hover:bg-white/10" : "text-black/80 hover:bg-black/5"
                    }`} onClick={() => setMobileMenuOpen(false)}>
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Admin
                    </Link>
                  )}
                  {session?.user?.planTier === "UNLIMITED" && (
                    <Link href="/dashboard/ai-chat" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors border border-violet-500/30 ${
                      isDark ? "text-violet-300 hover:bg-violet-500/10" : "text-violet-700 hover:bg-violet-50"
                    }`} onClick={() => setMobileMenuOpen(false)}>
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      AI Chat
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => { setTheme(isDark ? "light" : "dark"); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left ${
                      isDark ? "text-white/80 hover:bg-white/10" : "text-black/80 hover:bg-black/5"
                    }`}
                  >
                    {isDark ? (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                    {isDark ? "Light mode" : "Dark mode"}
                  </button>
                  <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isDark ? "text-white/80 hover:bg-white/10" : "text-black/80 hover:bg-black/5"
                  }`} onClick={() => setMobileMenuOpen(false)}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard
                  </Link>
                  <div className="border-t border-white/10 border-black/10 my-2" />
                  <div className="px-4 py-2">
                    <SignOutButton />
                  </div>
                </nav>
              </div>
            </>,
          document.body
        )}
      
      {/* Body: sidebar + main */}
      <div className="relative z-10 flex min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-5rem)]">
        {pathname === "/dashboard" && <DashboardSidebar isDark={isDark} />}
        <main className="flex-1 w-full overflow-x-hidden px-4 md:px-6 py-4 md:py-8 pb-8">
          {children}
        </main>
      </div>
      </div>
    </DashboardThemeContext.Provider>
  )
}
