import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { UpdatesContent } from "@/components/ui/updates-page"
import { isLocalDevelopment } from "@/lib/page-access"

export const metadata: Metadata = {
  title: "Updates - Typing Is Boring",
  description:
    "Stay up to date with the latest news, features, and announcements from Typing Is Boring.",
}

export default function UpdatesPage() {
  // In production, redirect to waitlist
  // In local development, allow access
  if (!isLocalDevelopment()) {
    redirect("/waitlist")
  }
  
  return <UpdatesContent />
}
