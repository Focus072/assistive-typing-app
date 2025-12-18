import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for typingisboring - How we handle your data",
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="text-white/60 hover:text-white text-sm mb-4 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-4xl font-semibold mb-2">Privacy Policy</h1>
          <p className="text-sm text-white/50">Last updated: December 2024</p>
        </div>
        <div className="space-y-6 text-white/70">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
            <p>
              We collect minimal information necessary to provide the service:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your Google account email address (for authentication)</li>
              <li>Document IDs you select for typing</li>
              <li>Job metadata (typing status, progress, timing)</li>
            </ul>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. What We Don't Store</h2>
            <p>
              We do not store:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your document content after typing completes</li>
              <li>Your Google OAuth tokens (handled by NextAuth)</li>
              <li>Any personal information beyond what's necessary for the service</li>
            </ul>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. How We Use Your Information</h2>
            <p>
              We use your information solely to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Authenticate you with Google</li>
              <li>Type text into the documents you select</li>
              <li>Track job progress and status</li>
            </ul>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Google Account Access</h2>
            <p>
              We request only the minimum Google Docs access needed to type into documents you select.
              You can revoke access at any time through your Google account settings.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Data Retention & Deletion</h2>
            <p>
              We retain data only as long as necessary to provide the service:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Job text content:</strong> Scrubbed after 30 days for privacy</li>
              <li><strong>Job metadata:</strong> Deleted after 90 days</li>
              <li><strong>Account data:</strong> Retained while your account is active</li>
            </ul>
            <p className="mt-2">
              You can request deletion of your account and all associated data at any time. Upon account deletion,
              all your data will be permanently removed within 30 days.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Encrypted database connections</li>
              <li>Secure OAuth token storage</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">7. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of your account data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and all data</li>
              <li><strong>Revocation:</strong> Revoke Google account access at any time</li>
              <li><strong>Correction:</strong> Update your account information</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, please contact us through the support channels provided in the application.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">8. Children's Privacy</h2>
            <p>
              typingisboring is not intended for users under the age of 13. We do not knowingly collect personal
              information from children under 13. If you believe we have collected information from a child under 13,
              please contact us immediately.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by
              posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>
          <div className="pt-8 border-t border-white/10">
            <p className="text-sm text-white/50">
              For privacy questions or data deletion requests, please contact us through the support channels provided in the application.
            </p>
            <div className="mt-4 flex gap-4 text-sm">
              <Link href="/terms" className="text-white/60 hover:text-white underline">
                Terms of Service
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

