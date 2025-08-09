import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | WEBTOYS',
  description: 'Terms of service for using WEBTOYS to create web apps via SMS.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-orange-400 hover:text-orange-300 transition-colors mb-6"
          >
            ← Back to WEBTOYS
          </Link>
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-gray-400">
            Last updated: August 9, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-orange max-w-none">
          <div className="space-y-8">
            
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Welcome to WEBTOYS</h2>
              <p className="text-gray-300 leading-relaxed">
                By using WEBTOYS, you agree to these terms. If you don't agree with any part, 
                please don't use our service. We've tried to keep this straightforward and honest.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">What WEBTOYS Does</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                WEBTOYS is a service that:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Receives your app ideas via SMS text messages</li>
                <li>Uses AI to create web apps, games, and pages based on your ideas</li>
                <li>Publishes your apps on the web for anyone to use</li>
                <li>Lets other users remix and modify your creations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Your Responsibilities</h2>
              
              <h3 className="text-xl font-medium text-orange-400 mb-3">Content Guidelines</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                When creating apps with WEBTOYS, please don't submit ideas that:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Are illegal, harmful, or violate others' rights</li>
                <li>Contain hate speech, harassment, or discriminatory content</li>
                <li>Include personal information you don't want public</li>
                <li>Infringe on copyrights, trademarks, or other intellectual property</li>
                <li>Are designed to spam, scam, or deceive users</li>
                <li>Contain malicious code or security vulnerabilities</li>
              </ul>

              <h3 className="text-xl font-medium text-orange-400 mb-3 mt-6">Fair Use</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Use WEBTOYS reasonably - don't spam us with excessive requests</li>
                <li>Don't try to break, hack, or abuse our service</li>
                <li>Respect our SMS rate limits and guidelines</li>
                <li>Don't impersonate others or create fake accounts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Your Apps and Ownership</h2>
              
              <h3 className="text-xl font-medium text-orange-400 mb-3">What You Own</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                You keep ownership of your original ideas and creative input. However:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>The generated code and apps are created using our AI system</li>
                <li>You grant us permission to host and display your apps publicly</li>
                <li>Other users can view, use, and remix your apps</li>
                <li>Remixes create new works that may have shared ownership</li>
              </ul>

              <h3 className="text-xl font-medium text-orange-400 mb-3 mt-6">Public Nature</h3>
              <p className="text-gray-300 leading-relaxed">
                All apps created through WEBTOYS are public by default. They'll be visible on our 
                website, can appear in trending sections, and are accessible to anyone on the internet.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Service Availability</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We work hard to keep WEBTOYS running smoothly, but we can't guarantee:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>100% uptime or perfect availability</li>
                <li>That every app idea will work exactly as you imagine</li>
                <li>Permanent storage of all apps (though we try our best)</li>
                <li>Compatibility with all devices and browsers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">SMS and Messaging</h2>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Standard SMS rates apply based on your carrier</li>
                <li>You can opt out anytime by texting "STOP"</li>
                <li>We may send updates about your apps and service notifications</li>
                <li>Message frequency varies based on your usage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Moderation and Removal</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We reserve the right to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Review apps and remove content that violates these terms</li>
                <li>Suspend or terminate accounts that abuse our service</li>
                <li>Modify or remove apps that cause technical issues</li>
                <li>Update our service and these terms as needed</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Limitations and Disclaimers</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                WEBTOYS is provided "as is" and we can't be held responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Apps that don't work as expected or contain bugs</li>
                <li>Any damages resulting from using WEBTOYS or the apps created</li>
                <li>Content created by other users or AI-generated content</li>
                <li>Loss of data or apps due to technical issues</li>
                <li>Third-party services we rely on (SMS providers, hosting, etc.)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Age Requirements</h2>
              <p className="text-gray-300 leading-relaxed">
                You must be at least 13 years old to use WEBTOYS. If you're under 18, 
                you should have parental permission to use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to These Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update these terms occasionally to reflect changes in our service or legal requirements. 
                We'll post updates here with a new "Last updated" date. Continued use means you accept the changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Termination</h2>
              <p className="text-gray-300 leading-relaxed">
                Either you or we can end your use of WEBTOYS at any time. If we terminate your account 
                for violating these terms, you may lose access to your apps and data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Contact and Disputes</h2>
              <p className="text-gray-300 leading-relaxed">
                Questions about these terms? Want to report an issue? We're here to help. 
                Most problems can be resolved through friendly conversation before involving lawyers.
              </p>
            </section>

            <section>
              <p className="text-gray-400 italic">
                Thanks for being part of the WEBTOYS community. We're excited to see what you'll create!
              </p>
            </section>

          </div>
        </div>

        {/* Footer navigation */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <Link 
              href="/privacy"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Privacy Policy
            </Link>
            <Link 
              href="/"
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              Back to WEBTOYS →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}