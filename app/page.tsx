import type { Metadata } from "next"
import SignInPageClient from "@/components/SignInPageClient"

export const metadata: Metadata = {
  title: "Typing Is Boring - Natural Typing for Google Docs",
  description:
    "Automate typing in Google Docs with natural human-like rhythm. Paste your text, pick a Google Doc, and watch it type itself with pauses, bursts, and realistic delays.",
  robots: {
    index: true,
    follow: true,
  },
}

export default function HomePage() {
  return (
    <div className="w-full min-h-screen bg-black">
      <SignInPageClient />
    </div>
  )
}
