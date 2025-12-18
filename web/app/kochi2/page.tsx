"use client";

import { Poppins } from "next/font/google";
import Image from "next/image";
import bgImage from "./bg.png";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function KochiLanding2() {
  return (
    <div className={`${poppins.className} relative h-screen w-full overflow-hidden`}>
      {/* Layer 1: Background Scene - Full bleed */}
      <Image
        src={bgImage}
        alt="Tokyo coffee alley at night"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      {/* Optional: subtle vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)'
        }}
      />

      {/* Layer 2: Ambient light pool on counter (behind Kochi) */}
      <div
        className="absolute z-10 pointer-events-none"
        style={{
          left: '34%',
          bottom: '42%',
          transform: 'translateX(-50%)',
          width: 'clamp(180px, 24vw, 280px)',
          height: 'clamp(60px, 8vw, 100px)',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(20px)',
        }}
      />

      {/* Layer 3: Kochi SVG - inline master with gentle curves */}
      <div
        className="absolute z-20"
        style={{
          left: '34%',
          bottom: '48%',
          transform: 'translateX(-50%) perspective(1000px) rotateX(5deg)',
          width: 'clamp(160px, 22vw, 260px)',
        }}
      >
        <svg
          viewBox="0 0 1024 1024"
          className="w-full h-auto"
          style={{
            filter: 'drop-shadow(0 0 40px rgba(255, 255, 255, 0.25)) drop-shadow(0 0 90px rgba(255, 255, 255, 0.15))'
          }}
        >
          <g id="kochi">
            <path
              id="body"
              fill="#FFFFFF"
              d="M256 192 C192 192 192 256 192 256 V768 C192 832 256 832 256 832 H768 C832 832 832 768 832 768 V256 C832 192 768 192 768 192 Z"
            />
            <rect id="face" x="332" y="412" width="360" height="240" rx="96" ry="96" fill="#1E2329" />
            <circle id="eyeL" cx="452" cy="532" r="26" fill="#FFFFFF" />
            <circle id="eyeR" cx="572" cy="532" r="26" fill="#FFFFFF" />
            <circle id="dotL" cx="448" cy="300" r="22" fill="#FFFFFF" />
            <circle id="dotR" cx="576" cy="300" r="22" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {/* Layer 3: Text + CTA Overlay */}
      <div className="relative z-20 flex flex-col items-center h-full px-6 pt-[10vh] sm:pt-[12vh]">
        {/* Logo / Wordmark */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-center"
          style={{
            color: '#ffffff',
            textShadow: '0 2px 20px rgba(0,0,0,0.6), 0 4px 40px rgba(0,0,0,0.4)'
          }}
        >
          Kochi.to
        </h1>

        {/* One-line description */}
        <p
          className="mt-2 sm:mt-3 text-lg sm:text-xl md:text-2xl font-normal text-center"
          style={{
            color: 'rgba(255,255,255,0.9)',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)'
          }}
        >
          AI delivered daily.
        </p>

        {/* Single CTA - positioned lower */}
        <div className="mt-auto mb-[12vh] sm:mb-[10vh]">
          <a
            href="sms:+18663300015?body=AI%20DAILY"
            className="inline-block px-8 py-4 text-lg sm:text-xl font-semibold rounded-full transition-all duration-200"
            style={{
              backgroundColor: '#FFE148',
              color: '#2C3E1F',
              boxShadow: '0 4px 24px rgba(255, 225, 72, 0.5)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 225, 72, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(255, 225, 72, 0.5)';
            }}
          >
            Try it &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
