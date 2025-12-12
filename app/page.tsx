"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { LandingPage } from "@/components/LandingPage"

export default function HomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") return // Wait for session to load
    
    if (session) {
      router.push("/dashboard")
    }
  }, [session, status, router])

  // Show landing page for logged-out users
  if (status === "unauthenticated") {
    return <LandingPage />
  }

  // Show loading state while checking session
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-black/30 rounded-full animate-spin border-t-black" />
    </div>
  )
}
