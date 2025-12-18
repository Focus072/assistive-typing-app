import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Cookie Notice",
  description: "Cookie Notice for typingisboring - How we use cookies",
  robots: {
    index: true,
    follow: true,
  },
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="text-white/60 hover:text-white text-sm mb-4 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-4xl font-semibold mb-2">Cookie Notice</h1>
          <p className="text-sm text-white/50">Last updated: December 2024</p>
        </div>
        <div className="space-y-6 text-white/70">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help websites
              remember your preferences and improve your experience.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. Cookies We Use</h2>
            <p>
              typingisboring uses minimal cookies:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Session cookies:</strong> Required for authentication and maintaining your login state</li>
              <li><strong>Preference cookies:</strong> Store your theme preference (light/dark mode)</li>
            </ul>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. Third-Party Cookies</h2>
            <p>
              We use NextAuth for authentication, which may set cookies for session management. We do not use
              third-party analytics or advertising cookies.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Cookie Duration</h2>
            <p>
              <strong>Session cookies:</strong> Expire when you close your browser or after a period of inactivity.
            </p>
            <p>
              <strong>Preference cookies:</strong> Stored locally on your device and persist until you clear your browser data.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Managing Cookies</h2>
            <p>
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Block all cookies</li>
              <li>Block third-party cookies</li>
              <li>Delete cookies when you close your browser</li>
              <li>Delete specific cookies</li>
            </ul>
            <p className="mt-2">
              <strong>Note:</strong> Disabling cookies may affect your ability to use typingisboring, as authentication
              requires session cookies. Some features may not work properly without cookies enabled.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">6. Do Not Track</h2>
            <p>
              typingisboring does not respond to &quot;Do Not Track&quot; signals. We do not track users across websites or
              use tracking cookies for advertising purposes.
            </p>
          </section>
          <div className="pt-8 border-t border-white/10">
            <p className="text-sm text-white/50">
              For questions about our cookie usage, please contact us through the support channels provided in the application.
            </p>
            <div className="mt-4 flex gap-4 text-sm">
              <Link href="/terms" className="text-white/60 hover:text-white underline">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-white/60 hover:text-white underline">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

