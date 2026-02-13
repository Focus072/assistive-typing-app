import type { Metadata } from "next"
import { LaunchContent } from "@/components/ui/launch-page"

export const metadata: Metadata = {
  title: "Launch - Typing Is Boring",
  description:
    "Typing Is Boring is launching soon. Be the first to experience natural typing automation for Google Docs.",
}

export default function LaunchPage() {
  return <LaunchContent />
}
