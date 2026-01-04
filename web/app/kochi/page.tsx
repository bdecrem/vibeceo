"use client";

import { Poppins } from "next/font/google";

// Switch scenes by changing this import:
// import Scene from './scenes/haven';
// import Scene from './scenes/izakaya';
// import Scene from './scenes/tokyo';
import Scene from './scenes/snowfantasy';

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function KochiLanding() {
  return (
    <>
      <style jsx global>{`
        html {
          background: #1a2a1a;
        }
        body {
          margin: 0;
          padding: 0;
          background: #1a2a1a;
        }
      `}</style>
      <div className={`${poppins.className} relative h-screen w-full overflow-hidden`}>
      {/* Scene (background + Kochi) */}
      <Scene />

      {/* Text + CTA Overlay (consistent across all scenes) */}
      <div className="relative z-30 h-screen flex flex-col items-center px-6 pt-[4vh] sm:pt-[6vh]">
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
          AI blasts delivered daily. Weather permitting.
        </p>

        {/* Single CTA - positioned lower */}
        <div className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 text-center">
          <a
            href="sms:+18663300015?body=AI%20DAILY"
            className="inline-block px-5 py-2.5 text-base sm:text-lg font-semibold rounded-full transition-all duration-200"
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
            Try it now &rarr;
          </a>
          <p className="mt-2 text-sm text-white/70">Daily AI reports over SMS.</p>
        </div>
      </div>
    </div>
    </>
  );
}
