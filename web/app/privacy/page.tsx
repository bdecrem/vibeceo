import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | WEBTOYS',
  description: 'Our privacy policy explains how WEBTOYS handles your data when you create apps via SMS.',
}

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-400">
            Last updated: August 9, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-orange max-w-none">
          <div className="space-y-8">
            
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">What is WEBTOYS?</h2>
              <p className="text-gray-300 leading-relaxed">
                WEBTOYS lets you create web apps, games, and pages by sending text messages. You text us your idea, 
                our AI builds it, and we publish it to the web. It's that simple.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-orange-400 mb-3">When You Text Us</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Your phone number (to send and receive messages)</li>
                <li>The messages you send us (your app ideas and instructions)</li>
                <li>The web apps we create for you</li>
              </ul>

              <h3 className="text-xl font-medium text-orange-400 mb-3 mt-6">When You Use Our Website</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Basic web usage data (pages visited, time spent)</li>
                <li>Your IP address and browser information</li>
                <li>Email address if you choose to provide it</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>To build your apps:</strong> We use your messages to understand what you want to create</li>
                <li><strong>To communicate with you:</strong> We send you updates about your apps via SMS</li>
                <li><strong>To improve our service:</strong> We analyze usage patterns to make WEBTOYS better</li>
                <li><strong>To keep things working:</strong> We use technical data to maintain and secure our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Your Apps and Privacy</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                The web apps we create for you are published publicly on the internet. This means:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Anyone can visit and use your apps</li>
                <li>Your apps will show up in our trending and featured sections</li>
                <li>Other users can remix (modify) your apps to create new versions</li>
                <li>Don't include personal information in your app ideas that you don't want public</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Data Sharing</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We don't sell your personal information. We may share data with:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Service providers:</strong> Companies that help us operate WEBTOYS (like Twilio for SMS)</li>
                <li><strong>AI providers:</strong> To generate your apps (your messages may be processed by AI services)</li>
                <li><strong>Legal requirements:</strong> If required by law or to protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You can:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Stop receiving SMS by texting "STOP"</li>
                <li>Request deletion of your personal data by emailing us</li>
                <li>Ask what personal information we have about you</li>
                <li>Request corrections to your information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
              <p className="text-gray-300 leading-relaxed">
                We use industry-standard security measures to protect your information. However, no system is 
                completely secure. We continuously work to improve our security practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                WEBTOYS is not intended for children under 13. If you're under 13, please don't use our service. 
                If we learn we've collected information from a child under 13, we'll delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to This Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this privacy policy from time to time. We'll notify you of major changes by 
                posting the new policy here and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Questions?</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have questions about this privacy policy or how we handle your data, 
                feel free to reach out to us. We're here to help and believe in being transparent 
                about how WEBTOYS works.
              </p>
            </section>

          </div>
        </div>

        {/* Footer navigation */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <Link 
              href="/"
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              ← Back to WEBTOYS
            </Link>
            <Link 
              href="/terms"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Terms of Service →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}