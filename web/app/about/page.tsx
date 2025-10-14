"use client";

import { useState } from "react";

export default function AboutPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText("18663300015");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  return (
    <div
      className="min-h-screen bg-[#fffef7] flex flex-col items-center justify-center px-5 py-12"
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        maxWidth: "100vw",
        minHeight: "100dvh"
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
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
            href="/"
            className="inline-flex items-center text-[#8a8a8a] hover:text-[#2C3E1F] transition-colors duration-200 text-sm font-medium"
          >
            ← Back to Kochi.to
          </a>
        </div>

        <article
          style={{
            fontFamily: "Poppins, sans-serif",
            color: "#2C3E1F"
          }}
        >
          <h1
            className="text-[36px] sm:text-[48px] leading-[1.1] font-[800] mb-8"
            style={{
              fontFamily: "Poppins, sans-serif",
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
              Kochi.to is your personal AI agent over SMS. I send short daily reports you can actually use — and you can get started by texting:
            </p>

            <ul className="space-y-3 pl-6 list-disc marker:text-[#FFE148]">
              <li>
                <strong>AI Daily</strong> → top 3 AI research papers from the last 24 hours
              </li>
              <li>
                <strong>Peer Review</strong> → the week's best academic drama
              </li>
              <li>
                <strong>Crypto</strong> → smart, no-hype insights from crypto research
              </li>
            </ul>

            <p>
              You can also just chat with me about anything — and if you use just the right words, I might even make a web page or web app for you, all over SMS.
            </p>

            <p>
              Text <strong>commands</strong> anytime for a full list of what I can do.
            </p>

            <div className="pt-6 border-t border-[rgba(44,62,31,0.12)] mt-8 space-y-3">
              <p className="text-[15px] sm:text-[16px]" style={{ color: "#8a8a8a" }}>
                Kochi.to was started by Bart Decrem, a longtime builder of creative tech projects.
              </p>

              <p className="text-[15px] sm:text-[16px]" style={{ color: "#8a8a8a" }}>
                Kochi.to is a production of Kochito Labs, a Wyoming Corporation.
              </p>
            </div>
          </div>
        </article>

        <div className="mt-12 flex justify-center">
          <a
            href="sms:8663300015?body=AI%20DAILY"
            className="rounded-full border-2 border-[#2C3E1F] px-8 py-4 text-lg font-bold transition-all duration-200 shadow-[0_8px_24px_rgba(255,225,72,0.4)]"
            style={{
              background: "#FFE148",
              color: "#2C3E1F",
              fontFamily: "Poppins, sans-serif"
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
            Try it now →
          </a>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={handleCopyPhone}
            className="text-[12px] sm:text-[14px] cursor-pointer hover:text-[#2C3E1F] transition-colors duration-200 relative"
            style={{
              color: "#8a8a8a"
            }}
          >
            +1-866-330-0015 (SMS/WhatsApp)
            {copied && (
              <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-[#2C3E1F] text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
