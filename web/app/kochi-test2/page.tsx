"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function KochiRiggedTestPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [gsapReady, setGsapReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gsap && !gsapReady) {
      setGsapReady(true);
    }
  }, [gsapReady]);

  // TODO: Add rigged character setup and animation functions here

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        strategy="afterInteractive"
        onLoad={() => setGsapReady(true)}
      />

      <div className="min-h-screen bg-[#fffef7] p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-[#2C3E1F] mb-2">
            Kochi Rigged Character Test
          </h1>
          <p className="text-gray-600 mb-8">
            Testing rigged version of Kochi with advanced animation controls
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Kochi Display */}
            <div className="bg-white rounded-lg shadow-lg p-8 flex items-center justify-center">
              <svg
                ref={svgRef}
                viewBox="0 0 1024 1024"
                className="w-full max-w-[320px] h-auto"
              >
                <defs>
                  <style>{`
                    .cls-1{fill:#ffe148}
                    .cls-2{fill:#2c3e1f}
                  `}</style>
                </defs>
                {/* TODO: Insert rigged Kochi SVG here */}
                <text x="512" y="512" textAnchor="middle" fill="#2C3E1F" fontSize="48">
                  Rigged Kochi Goes Here
                </text>
              </svg>
            </div>

            {/* Control Panel */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-[#2C3E1F] mb-4">Animation Controls</h2>
                <div className="space-y-2">
                  <button
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test Animation 1
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2">💡 Setup Notes:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Replace placeholder SVG with rigged character</li>
                  <li>• Set up bone/joint references</li>
                  <li>• Configure transform origins for rigged parts</li>
                  <li>• Add animation functions with GSAP</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
