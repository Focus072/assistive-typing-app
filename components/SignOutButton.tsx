"use client"

import { signOut } from "next-auth/react"

export function SignOutButton() {
  const handleSignOut = async () => {
    // Clear session and redirect to home page
    await signOut({ 
      callbackUrl: "/",
      redirect: true 
    })
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
