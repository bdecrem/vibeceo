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
    <div className="min-h-screen bg-[#f5f3f0] flex items-start md:items-center justify-center p-3 md:p-8">
      <div className="w-full max-h-[calc(100vh-1.5rem)] md:max-h-none md:max-w-5xl md:shadow-2xl flex flex-col">
        {/* Colorful grid with B52S letters */}
        <div className="relative flex-shrink-0 aspect-[4/3] md:aspect-[16/10] overflow-hidden">
          {/* Background color blocks */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-3">
            <div className="bg-[#f4c430] row-span-3" />
            <div className="bg-[#ff5722] row-span-2" />
            <div className="bg-[#1976d2] row-span-1" />
          </div>

          {/* B52S Letters */}
          <div className="absolute inset-0 flex items-start justify-center pt-4 md:pt-12">
            <div className="flex items-start justify-center -space-x-1 md:-space-x-4">
              <span
                className="text-[#1ba0c8] text-[28vw] md:text-[20rem] lg:text-[24rem] font-extrabold leading-none select-none -mt-2 md:-mt-10"
                style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
              >
                B
              </span>
              <span
                className="text-[#e8e4d9] text-[24vw] md:text-[16rem] lg:text-[20rem] font-extrabold leading-none mt-4 md:mt-10 select-none"
                style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
              >
                5
              </span>
              <span
                className="text-[#e8e4d9] text-[24vw] md:text-[16rem] lg:text-[20rem] font-extrabold leading-none mt-2 md:mt-[25px] select-none"
                style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
              >
                2
              </span>
              <span
                className="text-[#1976d2] text-[20vw] md:text-[13rem] lg:text-[16rem] font-extrabold leading-none mt-8 md:mt-16 select-none"
                style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
              >
                S
              </span>
            </div>
          </div>
        </div>

        {/* Tagline Section */}
        <div className="bg-[#f5f3f0] md:bg-[#e8e4d9] px-6 md:px-16 py-6 md:py-16 flex-shrink-0">
          <h1
            className="text-3xl md:text-7xl lg:text-8xl font-extrabold text-black leading-tight tracking-tight text-center"
            style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
          >
            little blasts of AI.
          </h1>

          {/* SMS CTA */}
          <div className="mt-4 md:mt-8 text-center">
            <p className="text-base md:text-xl text-gray-700 mb-3 md:mb-6">
              Private AI over SMS.
            </p>
            <a
              href="sms:8663300015?body=Howdy,%20what%20can%20you%20do?"
              className="inline-block px-8 md:px-10 py-2.5 md:py-3 border-2 border-gray-800 text-gray-800 text-sm md:text-lg font-medium tracking-wide hover:bg-gray-800 hover:text-white transition-all duration-300"
            >
              Try it now
            </a>
            <p className="mt-3 md:mt-4 text-xs md:text-sm text-gray-600">
              +1-866-330-0015 (SMS/WhatsApp)
            </p>
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