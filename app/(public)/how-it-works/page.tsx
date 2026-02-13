import type { Metadata } from "next"
import { HowItWorksContent } from "@/components/ui/how-it-works-page"

export const metadata: Metadata = {
  title: "How it works - Typing Is Boring",
  description:
    "Learn how Typing Is Boring works. Connect your Google account, paste your text, pick a Google Doc, and watch it type naturally with human-like rhythm.",
}

export default function HowItWorksPage() {
  return <HowItWorksContent />
}
