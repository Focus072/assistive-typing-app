import type { Metadata } from "next"
import { UpdatesContent } from "@/components/ui/updates-page"

export const metadata: Metadata = {
  title: "Updates - Typing Is Boring",
  description:
    "Stay up to date with the latest news, features, and announcements from Typing Is Boring.",
}

export default function UpdatesPage() {
  return <UpdatesContent />
}
