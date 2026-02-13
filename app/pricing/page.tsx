import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { PricingContent } from "@/components/ui/pricing-page"
import { isLocalDevelopment } from "@/lib/page-access"

export const metadata: Metadata = {
  title: "Pricing - Typing Is Boring",
  description:
    "Choose the perfect plan for your typing automation needs. Simple, transparent pricing for everyone.",
}

export default function PricingPage() {
  // In production, redirect to waitlist
  // In local development, allow access
  if (!isLocalDevelopment()) {
    redirect("/waitlist")
  }
  
  return <PricingContent />
}
