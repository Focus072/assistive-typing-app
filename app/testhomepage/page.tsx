import { redirect } from "next/navigation"
import SignInPageClient from "@/components/SignInPageClient"
import { isLocalDevelopment } from "@/lib/page-access"

export default function TestHomepage() {
  // In production, redirect to waitlist
  // In local development, allow access
  if (!isLocalDevelopment()) {
    redirect("/waitlist")
  }
  
  return (
    <div className="w-full min-h-screen bg-black">
      <SignInPageClient />
    </div>
  )
}
