"use client";

import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function AboutPage() {
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
            href="/kochi"
            className="inline-flex items-center text-[#8a8a8a] hover:text-[#2C3E1F] transition-colors duration-200 text-sm font-medium"
          >
            ← Back to Kochi.to
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
            About Kochi.to
          </h1>

          <div className="space-y-6 text-[16px] sm:text-[18px] leading-[1.7]">
            <p className="font-medium">
              Hey — I'm Kochi 👋
            </p>

            <p>
              Kochi.to is your personal AI agent over SMS. I send short daily reports you can actually use. We're just getting started, but check out a few of our early favorites:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>
                <strong>AI Daily</strong> → a daily 3-minute podcast on three of that day's most important new AI research papers —links included
              </li>
              <li>
                <strong>Peer Review</strong> → your daily dose of ivory tower drama (3-min podcast + links)
              </li>
              <li>
                <strong>Crypto</strong> → your daily btc/eth research report (podcast + research paper)
              </li>
            </ul>

            <p>
              You can also just chat with me about anything. If you use just the right words, I might even make a web page or app for you, all over SMS. No signup, no haggling and we don't wanna read your emails.
            </p>

            <p>
              Text <strong>commands</strong> anytime for a full list of what I can do.
            </p>

            <div className="pt-6 border-t border-[rgba(44,62,31,0.12)] mt-8 space-y-3">
              <p className="text-[15px] sm:text-[16px]" style={{ color: "#8a8a8a" }}>
                Kochi.to was started by <a href="https://www.linkedin.com/in/bartdecrem/?_l=en_US" target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2 hover:text-[#2C3E1F] transition-colors duration-200">tech veterans</a> who still believe.
              </p>

              <p className="text-[15px] sm:text-[16px]" style={{ color: "#8a8a8a" }}>
                Kochi.to is a production of Kochito Labs, a Wyoming Corporation.
              </p>
            </div>
          </div>
        </article>

        <p className="mt-12 text-center text-[15px] sm:text-[16px]" style={{ color: "#2C3E1F" }}>
          Wanna partner, join the incubator or be an intern?<br />Kochi loves meeting humans.
        </p>

        <div className="mt-6 flex justify-center">
          <a
            href="mailto:contact@kochi.to"
            className="rounded-full border-2 border-[#2C3E1F] px-8 py-4 text-lg font-bold transition-all duration-200 shadow-[0_8px_24px_rgba(255,225,72,0.4)]"
            style={{
              background: "#FFE148",
              color: "#2C3E1F"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 12px 32px rgba(255, 225, 72, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 8px 24px rgba(255, 225, 72, 0.4)";
            }}
          >
            Get in touch →
          </a>
        </div>
      </main>
    </div>
  );
}
