"use client";

import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function TermsPage() {
  return (
    <div
      className={`${poppins.className} min-h-screen bg-[#fffef7] flex flex-col items-center justify-center px-5 py-12`}
      style={{
        maxWidth: "100vw",
        minHeight: "100dvh"
      }}
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          overflow-x: hidden;
          max-width: 100vw;
        }
      `}</style>

      <main className="w-full max-w-[600px] px-4 sm:px-0">
        <div className="mb-8">
          <a
            href="/about"
            className="inline-flex items-center text-[#8a8a8a] hover:text-[#2C3E1F] transition-colors duration-200 text-sm font-medium"
          >
            ← Back to About
          </a>
        </div>

        <article
          style={{
            color: "#2C3E1F"
          }}
        >
          <h1
            className="text-[36px] sm:text-[48px] leading-[1.1] font-[800] mb-8"
            style={{
              color: "#2C3E1F"
            }}
          >
            Terms of Service
          </h1>

          <div className="space-y-6 text-[13px] sm:text-[15px] leading-[1.6] font-medium">
            <p className="text-[12px] sm:text-[13px]" style={{ color: "#8a8a8a" }}>
              Last updated: October 20, 2025
            </p>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Agreement to Terms
            </h2>

            <p>
              By using Kochi.to, you agree to these terms. If you don't agree, please don't use the service.
            </p>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Service Description
            </h2>

            <p>
              Kochi.to is an AI agent service that:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>Sends daily reports via SMS based on your subscriptions</li>
              <li>Responds to your messages with AI-generated content</li>
              <li>Creates web pages and apps based on your requests</li>
              <li>Provides personalized information and assistance</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              User Responsibilities
            </h2>

            <p>
              You agree to:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>Use the service for lawful purposes only</li>
              <li>Not abuse, harass, or harm the service or others</li>
              <li>Not attempt to reverse engineer or exploit the system</li>
              <li>Accept that AI-generated content may contain errors</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Content and Intellectual Property
            </h2>

            <p>
              Content you create through Kochi.to:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>You retain ownership of your input and created content</li>
              <li>You grant us license to process and display your content</li>
              <li>Public pages may be visible to others</li>
              <li>We may use aggregated data to improve the service</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Service Availability
            </h2>

            <p>
              Kochi.to is provided "as is":
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>We don't guarantee uninterrupted service</li>
              <li>We may modify or discontinue features</li>
              <li>We may suspend accounts that violate these terms</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Limitation of Liability
            </h2>

            <p>
              Kochi.to and Kochito Labs are not liable for:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>Errors or inaccuracies in AI-generated content</li>
              <li>Loss of data or service interruptions</li>
              <li>Actions taken based on information from the service</li>
              <li>Third-party content or links</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              SMS and Messaging
            </h2>

            <p>
              By using Kochi.to via SMS:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>Message and data rates may apply</li>
              <li>You can text STOP to unsubscribe at any time</li>
              <li>We respect messaging frequency preferences</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Changes to Terms
            </h2>

            <p>
              We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Contact
            </h2>

            <p>
              Questions about these terms? Email us at{" "}
              <a
                href="mailto:legal@kochi.to"
                className="underline decoration-1 underline-offset-2 hover:text-[#8a8a8a] transition-colors duration-200"
              >
                legal@kochi.to
              </a>
            </p>

            <div className="pt-6 border-t border-[rgba(44,62,31,0.12)] mt-8">
              <p className="text-[12px] sm:text-[13px]" style={{ color: "#8a8a8a" }}>
                Kochi.to is operated by Kochito Labs, a Wyoming Corporation.
              </p>
            </div>
          </div>
        </article>

        <footer className="mt-12 pt-8 border-t border-[rgba(44,62,31,0.12)]">
          <div className="flex justify-center gap-6 text-[12px] sm:text-[13px]">
            <a
              href="/privacy"
              className="transition-colors duration-200"
              style={{ color: "#8a8a8a" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#2C3E1F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8a8a8a";
              }}
            >
              Privacy Policy
            </a>
            <span style={{ color: "#8a8a8a" }}>•</span>
            <a
              href="/about"
              className="transition-colors duration-200"
              style={{ color: "#8a8a8a" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#2C3E1F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8a8a8a";
              }}
            >
              About
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
