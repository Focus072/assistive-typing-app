import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { LaunchContent } from "@/components/ui/launch-page"
import { isLocalDevelopment } from "@/lib/page-access"

export const metadata: Metadata = {
  title: "Launch - Typing Is Boring",
  description:
    "Typing Is Boring is launching soon. Be the first to experience natural typing automation for Google Docs.",
}

export default function LaunchPage() {
  // In production, redirect to waitlist
  // In local development, allow access
  if (!isLocalDevelopment()) {
    redirect("/waitlist")
  }
  
  return <LaunchContent />
}
