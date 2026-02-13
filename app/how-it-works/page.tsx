import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { HowItWorksContent } from "@/components/ui/how-it-works-page"
import { isLocalDevelopment } from "@/lib/page-access"

export const metadata: Metadata = {
  title: "How it works - Typing Is Boring",
  description:
    "Learn how Typing Is Boring works. Connect your Google account, paste your text, pick a Google Doc, and watch it type naturally with human-like rhythm.",
}

export default function HowItWorksPage() {
  // In production, redirect to waitlist
  // In local development, allow access
  if (!isLocalDevelopment()) {
    redirect("/waitlist")
  }
  
  return <HowItWorksContent />
}
