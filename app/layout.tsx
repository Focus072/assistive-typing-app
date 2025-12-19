import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { ErrorBoundary } from "@/components/ErrorBoundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://typingisboring.com"),
  title: {
    default: "Typing Is Boring - Natural typing for Google Docs",
    template: "%s | Typing Is Boring",
  },
  description: "Paste your text, pick a document, and watch it type itself with natural pacing. Automate typing into Google Docs with human-like rhythm.",
  keywords: ["typing", "automation", "Google Docs", "natural typing", "typing simulator", "productivity"],
  authors: [{ name: "typingisboring" }],
  creator: "typingisboring",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Typing Is Boring",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Typing Is Boring",
    title: "Typing Is Boring - Natural typing for Google Docs",
    description: "Paste your text, pick a document, and watch it type itself with natural pacing.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Typing Is Boring - Natural typing for Google Docs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Typing Is Boring - Natural typing for Google Docs",
    description: "Paste your text, pick a document, and watch it type itself with natural pacing.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}


