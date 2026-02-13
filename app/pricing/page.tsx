import type { Metadata } from "next"
import { PricingContent } from "@/components/ui/pricing-page"

export const metadata: Metadata = {
  title: "Pricing - Typing Is Boring",
  description:
    "Choose the perfect plan for your typing automation needs. Simple, transparent pricing for everyone.",
}

export default function PricingPage() {
  return <PricingContent />
}
