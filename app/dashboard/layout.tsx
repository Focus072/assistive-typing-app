"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SignOutButton } from "@/components/SignOutButton"
import { useEffect } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Show loading state while checking session
  if (status === "loading") {
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
    <div className="min-h-screen bg-white">
      {/* Header - Mobile Optimized */}
      <header className="relative z-10 border-b border-black bg-white shadow-sm">
        <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 md:gap-3 group flex-shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-black flex items-center justify-center shadow-sm group-hover:bg-gray-900 transition-colors">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-bold text-black">TypeFlow</h1>
              <p className="text-xs text-gray-600 hidden md:block">Assistive Typing Engine</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden lg:flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gray-100 border border-black">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs md:text-sm text-black truncate max-w-[150px]">{session.user?.email}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      
      {/* Main content - Mobile Optimized */}
      <main className="relative z-10 container mx-auto px-4 md:px-6 py-4 md:py-8 pb-20 md:pb-8">
        {children}
      </main>
      
      {/* Footer - Mobile Optimized */}
      <footer className="relative z-10 border-t border-black bg-white py-4 md:py-6 mt-8 md:mt-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm text-gray-600">
          <p className="text-center sm:text-left">© 2024 TypeFlow. Assistive technology for everyone.</p>
          <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
            <span>Powered by AI</span>
            <div className="w-1 h-1 rounded-full bg-black" />
            <span>Google Docs Integration</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
