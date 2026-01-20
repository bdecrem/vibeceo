"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function WtafPage() {
  const [inputText, setInputText] = useState('');

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f1f5f9] via-[#e2e8f0] to-[#cbd5e1]">
      {/* SMS Banner - same as homepage */}
      <div className="relative z-20 bg-gradient-to-r from-[#40e0d0] to-[#8b5cf6] py-5 md:mr-7 md:rounded-r-3xl">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 md:pl-8 md:pr-8 text-white text-center md:text-left">
          <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-snug max-w-5xl">
            World leading startup coaches, freshly minted. Still cheaper than a cofounder.
          </p>
          <Link href="/">
                          <button className="mt-4 md:mt-0 shrink-0 bg-white text-[#8b5cf6] font-bold px-6 py-3 rounded-full hover:opacity-90 transition whitespace-nowrap shadow-md">
                Take me there →
              </button>
          </Link>
        </div>
      </div>

      {/* AdvisorsFoundry Logo & Textmark */}
      <nav className="container mx-auto py-6">
        <div className="flex items-center gap-2">
          <Image
            src="/images/logo-grey.png?v=2"
            alt="AdvisorsFoundry Logo"
            width={32}
            height={32}
            className="w-8 h-8"
            unoptimized
          />
          <div className="text-xl font-bold">
            <span className="text-[#40e0d0]">Advisors</span>
            <span className="text-gray-500">Foundry</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16 flex items-center justify-center">
        <div className="w-full max-w-2xl rounded-3xl p-8 md:p-10 bg-white shadow-2xl border border-gray-200">
          <div className="text-center mb-8">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
                🚀 Text something unhinged. We'll ship it anyway.
              </h1>
            </div>
            <p className="text-xl text-gray-700 font-medium">Code generation so chaotic, it just might work.</p>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#ff6b6b]/15 to-[#4ecdc4]/15 p-6 rounded-2xl border border-[#ff6b6b]/30">
              <p className="text-gray-700 text-lg">
                Our SMS bot turns chaotic prompts into chaotic apps. Expect bad code, great energy, and a URL you'll regret sharing.
              </p>
            </div>

            {/* How it Works */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">How to Generate Chaos:</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <span className="bg-[#ff6b6b] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <p className="font-semibold text-gray-800">Text START to 866-330-0015:</p>
                    <p className="text-gray-600 text-sm mt-1">Sorry, US only for now.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <span className="bg-[#ff6b6b] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <p className="font-semibold text-gray-800">Send your WTAF command:</p>
                    <div className="text-gray-600 text-sm mt-1 space-y-1">
                      <p><code className="bg-gray-200 px-2 py-1 rounded">WTAF build me a crossword puzzle</code></p>
                      <p><code className="bg-gray-200 px-2 py-1 rounded">CODE: make a todo app that judges me</code></p>
                      <p><code className="bg-gray-200 px-2 py-1 rounded">WTAF create a meme generator</code></p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <span className="bg-[#ff6b6b] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <p className="font-semibold text-gray-800">Get your chaos URL:</p>
                    <p className="text-gray-600 text-sm mt-1">We'll text you back with a fun URL like <code className="bg-gray-200 px-1 rounded">golden-fox-dancing.html</code></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Input */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Try This Format:</h3>
              <div className="flex max-w-full">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="WTAF build me a delusional pitch deck generator" 
                  className="flex-1 bg-white border-2 border-gray-300 rounded-l-xl px-4 py-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:border-[#ff6b6b] transition-all duration-200"
                />
                <button 
                  onClick={() => {
                    if (inputText) {
                      navigator.clipboard.writeText(inputText);
                      alert('Copied! Now text this to our SMS bot.');
                    }
                  }}
                  className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white rounded-r-xl px-6 py-4 font-bold hover:shadow-lg transition-all"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-gray-600">Type your idea above, then copy and text it to our SMS bot!</p>
            </div>

            {/* Access Info */}
            <div className="text-center space-y-4 text-gray-600 bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🚀</span>
                <p className="font-semibold">
                  WTAF only works if you're subscribed to our SMS system.
                </p>
              </div>
              <p>
                Not signed up yet? <Link href="/sms" className="text-[#ff6b6b] hover:text-[#ff6b6b]/80 font-semibold underline">Join our SMS chaos here</Link>.
              </p>
              <p className="text-sm">
                Each WTAF request gets you a unique, shareable URL. Perfect for flexing your questionable app ideas on social media.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
