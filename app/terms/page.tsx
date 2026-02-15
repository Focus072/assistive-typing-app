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
          <p className="text-sm text-white/50">Last updated: February 2025</p>
        </div>
        <div className="space-y-6 text-white/70">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using typingisboring, you accept and agree to be bound by these Terms of Service.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. Service Description — Assistive Typing Utility</h2>
            <p>
              typingisboring is an <strong>Assistive Typing Utility</strong> for productivity and accessibility. It types text into Google Docs on your behalf with natural pacing. The service is intended to help users automate typing tasks at their request.
            </p>
            <p>
              <strong>As-Is Service:</strong> We do not guarantee that the service will bypass all detection, proctoring software, or academic integrity systems. The service is provided &quot;as is&quot; without warranties of any kind.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. User Responsibility — Academic Integrity</h2>
            <p>
              <strong>You are solely responsible</strong> for following your school&apos;s, institution&apos;s, or employer&apos;s academic integrity policies and honor codes. We are not liable for any disciplinary consequences, academic penalties, or other outcomes resulting from your use of the service.
            </p>
            <p>
              By using this service, you represent that you understand and accept full responsibility for ensuring your use complies with all applicable rules and policies.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Google Account Access</h2>
            <p>
              You grant typingisboring permission to access your Google Docs for the sole purpose of typing text
              into documents you select. You can revoke this access at any time through your Google account settings.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Refunds — Academic Failure Not Valid</h2>
            <p>
              <strong>Academic failure, disciplinary action, or detection by proctoring or academic integrity systems is not a valid reason for a refund.</strong> Refund eligibility is governed by our standard refund policy. You assume all risk associated with your use of the service.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">6. Limitation of Liability</h2>
            <p>
              typingisboring is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages, losses, or consequences arising from your use of the service, including but not limited to academic penalties, detection by third-party software, or any other outcomes.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">7. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service constitutes
              acceptance of modified terms.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">8. Account Termination</h2>
            <p>
              You may stop using the service at any time by revoking Google account access. We reserve the right
              to suspend or terminate accounts that violate these terms or engage in abusive behavior.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">9. Contact</h2>
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

