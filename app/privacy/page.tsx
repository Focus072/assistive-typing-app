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
            <h2 className="text-xl font-semibold text-white">2. What We Don&apos;t Store</h2>
            <p>
              We do not store:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your document content after typing completes</li>
              <li>Any personal information beyond what&apos;s necessary for the service</li>
            </ul>
            <p className="mt-2">
              <strong>OAuth Token Storage:</strong> Google OAuth tokens are stored securely by our authentication provider (NextAuth) to authenticate requests on your behalf. These tokens are used only to provide the core functionality of the service and are never shared, sold, or used outside this scope.
            </p>
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
              <li>We do not share your Google user data with third parties.</li>
            </ul>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell, rent, or trade your Google user data. We do not share your Google user data with third parties for their own purposes.
            </p>
            <p>
              Your Google user data is only disclosed in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Legal requirements:</strong> If required by law, court order, or government regulation, we may disclose data to law enforcement or regulatory authorities.</li>
              <li><strong>Infrastructure providers:</strong> We use third-party infrastructure providers (hosting, database services) to operate the service. These providers process data solely on our behalf under strict contractual obligations and do not own, use, or share your Google user data for their own purposes.</li>
            </ul>
            <p className="mt-2">
              We do not use Google user data for advertising, analytics, or training AI models.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Google Account Access</h2>
            <p>
              We request only the minimum Google Docs access needed to type into documents you select.
              You can revoke access at any time through your Google account settings.
            </p>
            <p className="mt-2">
              We do not allow human review of Google Docs content. Human access to your Google Docs content occurs only if strictly necessary for technical support and only with your explicit consent.
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">6. Google Limited Use Disclosure</h2>
            <p>
              Our use and transfer of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline hover:text-white/80"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p>
              Google user data is used only to provide the core functionality of the application:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>To authenticate your identity</li>
              <li>To access and type text into the Google Docs you select</li>
              <li>To manage document permissions and access</li>
            </ul>
            <p className="mt-2">
              We do not use Google user data for advertising, analytics, profiling, or training machine learning or AI models. Google user data is not shared with third parties except as explicitly disclosed in Section 4 (Data Sharing and Disclosure).
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">7. Data Retention & Deletion</h2>
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
            <h2 className="text-xl font-semibold text-white">8. Data Security</h2>
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
            <h2 className="text-xl font-semibold text-white">9. Your Rights</h2>
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
              To exercise these rights, please contact us at{" "}
              <a
                href="mailto:support@typingisboring.com"
                className="text-white underline hover:text-white/80"
              >
                support@typingisboring.com
              </a>
              .
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">10. Children&apos;s Privacy</h2>
            <p>
              typingisboring is not intended for users under the age of 13. We do not knowingly collect personal
              information from children under 13. If you believe we have collected information from a child under 13,
              please contact us immediately at{" "}
              <a
                href="mailto:support@typingisboring.com"
                className="text-white underline hover:text-white/80"
              >
                support@typingisboring.com
              </a>
              .
            </p>
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by
              posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>
          <div className="pt-8 border-t border-white/10">
            <p className="text-sm text-white/50">
              For privacy questions or data deletion requests, please contact us at{" "}
              <a
                href="mailto:support@typingisboring.com"
                className="text-white/70 underline hover:text-white"
              >
                support@typingisboring.com
              </a>
              .
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

