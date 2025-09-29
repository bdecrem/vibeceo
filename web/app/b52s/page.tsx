"use client";

import { useEffect, useState } from "react";

export default function B52LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration issues
  }

  return (
    <div className="min-h-screen bg-[#f5f3f0] flex items-center justify-center p-0 md:p-8">
      <div className="w-full md:max-w-5xl md:shadow-2xl">
        {/* Colorful grid with B52S letters */}
        <div className="relative aspect-[4/3] md:aspect-[16/10] overflow-hidden">
          {/* Background color blocks */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-3">
            <div className="bg-[#f4c430] row-span-3" />
            <div className="bg-[#ff5722] row-span-2" />
            <div className="bg-[#1976d2] row-span-1" />
          </div>

          {/* B52S Letters */}
          <div className="absolute inset-0 flex items-start justify-center pt-8 md:pt-12">
            <div className="flex items-start justify-center -space-x-2 md:-space-x-4">
              <span
                className="text-[#1ba0c8] text-[32vw] md:text-[18rem] lg:text-[22rem] font-extrabold leading-none select-none"
                style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
              >
                B
              </span>
              <span
                className="text-[#e8e4d9] text-[28vw] md:text-[16rem] lg:text-[20rem] font-extrabold leading-none mt-6 md:mt-10 select-none"
                style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
              >
                5
              </span>
              <span
                className="text-[#e8e4d9] text-[28vw] md:text-[16rem] lg:text-[20rem] font-extrabold leading-none mt-6 md:mt-10 select-none"
                style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
              >
                2
              </span>
              <span
                className="text-[#1976d2] text-[22vw] md:text-[13rem] lg:text-[16rem] font-extrabold leading-none mt-12 md:mt-16 select-none"
                style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
              >
                S
              </span>
            </div>
          </div>
        </div>

        {/* Tagline Section */}
        <div className="bg-[#e8e4d9] px-8 md:px-16 py-12 md:py-16">
          <h1
            className="text-4xl md:text-7xl lg:text-8xl font-extrabold text-black leading-tight tracking-tight text-center"
            style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
          >
            little blasts of AI.
          </h1>

          {/* SMS CTA */}
          <div className="mt-8 text-center">
            <p className="text-lg md:text-xl text-gray-700 mb-6">
              Private AI over SMS.
            </p>
            <a
              href="sms:8663300015?body=Howdy,%20what%20can%20you%20do?"
              className="inline-block px-10 py-3 border-2 border-gray-800 text-gray-800 text-base md:text-lg font-medium tracking-wide hover:bg-gray-800 hover:text-white transition-all duration-300"
            >
              Try it now
            </a>
          </div>
        </div>
      </div>

      {/* Simple CSS for any additional styling */}
      <style jsx>{`
        @media (max-width: 768px) {
          .bg-\\[\\#f5f3f0\\] {
            background-color: #f5f3f0;
          }
        }
      `}</style>
    </div>
  );
}