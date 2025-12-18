import type { Metadata } from "next"
import SignInPageClient from "@/components/SignInPageClient"

export const metadata: Metadata = {
  title: "typingisboring - Natural typing for Google Docs",
  description: "Paste your text, pick a document, and watch it type itself with natural pacing. Automate typing into Google Docs with human-like rhythm.",
  openGraph: {
    title: "typingisboring - Natural typing for Google Docs",
    description: "Paste your text, pick a document, and watch it type itself with natural pacing.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "typingisboring",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "typingisboring - Natural typing for Google Docs",
    description: "Paste your text, pick a document, and watch it type itself with natural pacing.",
    images: ["/og-image.png"],
  },
}

export default function HomePage() {
  // Render the full 21st.dev sign-in flow (with auth-aware navbar)
  // on the main home page.
  return <SignInPageClient />
}
