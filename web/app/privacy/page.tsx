"use client";

import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>

          <div className="space-y-6 text-[13px] sm:text-[15px] leading-[1.6] font-medium">
            <p className="text-[12px] sm:text-[13px]" style={{ color: "#8a8a8a" }}>
              Last updated: October 20, 2025
            </p>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              What We Collect
            </h2>

            <p>
              When you use Kochi.to, we collect:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>Your phone number (to send you SMS messages)</li>
              <li>Messages you send to Kochi</li>
              <li>Content you create through the service</li>
              <li>Subscription preferences (which daily reports you want)</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              How We Use Your Information
            </h2>

            <p>
              We use your information to:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>Provide the AI agent service over SMS</li>
              <li>Send you daily reports you've subscribed to</li>
              <li>Generate web pages and apps based on your requests</li>
              <li>Improve our service and develop new features</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Data Sharing
            </h2>

            <p>
              We do not sell your personal information. We may share data with:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>Service providers (Twilio for SMS, Claude AI for responses)</li>
              <li>Law enforcement if required by law</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Your Rights
            </h2>

            <p>
              You can:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>Stop receiving messages at any time by texting "STOP"</li>
              <li>Request deletion of your data by contacting us</li>
              <li>Access your data by contacting us</li>
            </ul>

            <h2 className="text-[20px] sm:text-[24px] font-bold mt-8 mb-4">
              Contact
            </h2>

            <p>
              Questions about privacy? Email us at{" "}
              <a
                href="mailto:privacy@kochi.to"
                className="underline decoration-1 underline-offset-2 hover:text-[#8a8a8a] transition-colors duration-200"
              >
                privacy@kochi.to
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
              href="/terms"
              className="transition-colors duration-200"
              style={{ color: "#8a8a8a" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#2C3E1F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8a8a8a";
              }}
            >
              Terms of Service
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
