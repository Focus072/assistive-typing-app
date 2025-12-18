import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for typingisboring - Natural typing for Google Docs",
  robots: {
    index: true,
    follow: true,
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="text-white/60 hover:text-white text-sm mb-4 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-4xl font-semibold mb-2">Terms of Service</h1>
          <p className="text-sm text-white/50">Last updated: December 2024</p>
        </div>
        <div className="space-y-6 text-white/70">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using typingisboring, you accept and agree to be bound by these Terms of Service.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. Service Description</h2>
            <p>
              typingisboring provides a service that types text into Google Docs on your behalf with natural pacing.
              You are responsible for the content you choose to type.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. Google Account Access</h2>
            <p>
              You grant typingisboring permission to access your Google Docs for the sole purpose of typing text
              into documents you select. You can revoke this access at any time through your Google account settings.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. User Responsibilities</h2>
            <p>
              You are responsible for ensuring you have the right to type content into the documents you select.
              You agree not to use the service for any illegal or unauthorized purpose.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Limitation of Liability</h2>
            <p>
              typingisboring is provided &quot;as is&quot; without warranties. We are not liable for any damages arising from
              your use of the service.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">6. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service constitutes
              acceptance of modified terms.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">7. Account Termination</h2>
            <p>
              You may stop using the service at any time by revoking Google account access. We reserve the right
              to suspend or terminate accounts that violate these terms or engage in abusive behavior.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">8. Contact</h2>
            <p>
              For questions about these terms, please contact us through the support channels provided in the application.
            </p>
          </section>
          <div className="pt-8 border-t border-white/10">
            <p className="text-sm text-white/50">
              By using typingisboring, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
            <div className="mt-4 flex gap-4 text-sm">
              <Link href="/privacy" className="text-white/60 hover:text-white underline">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="text-white/60 hover:text-white underline">
                Cookie Notice
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

