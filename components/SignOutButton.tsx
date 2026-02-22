"use client"

import { signOut } from "next-auth/react"

interface SignOutButtonProps {
  variant?: "solid" | "ghost"
  isDark?: boolean
}

export function SignOutButton({ variant = "solid", isDark = false }: SignOutButtonProps) {
  const handleSignOut = async () => {
    await signOut({
      callbackUrl: "/",
      redirect: true
    })
  }

  if (variant === "ghost") {
    return (
      <button
        onClick={handleSignOut}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full ${
          isDark
            ? "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
            : "text-black/50 hover:text-black/80 hover:bg-black/[0.04]"
        }`}
        aria-label="Sign out"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sign Out
      </button>
    )
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-gray-50 text-sm font-medium transition-all"
      aria-label="Sign out"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Sign Out
    </button>
  )
}
