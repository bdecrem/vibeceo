'use client'

import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export default function CoinRundownPage() {
  return (
    <div className={`min-h-screen bg-black text-white ${poppins.className}`}>
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-amber-900/10 via-transparent to-transparent pointer-events-none" />

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
        {/* Logo / Brand */}
        <div className="mb-8">
          <span className="text-4xl">🪙</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 tracking-tight">
          Coin Rundown
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-amber-400 font-medium text-center mb-8">
          Your daily crypto briefing. Via text.
        </p>

        {/* Value prop */}
        <p className="text-gray-400 text-center max-w-md mb-12 leading-relaxed">
          Wake up to the only crypto update you need. AI-curated news, prices, and insights delivered to your phone every morning at 7 AM.
        </p>

        {/* Benefits */}
        <div className="flex flex-col gap-4 mb-12 text-left">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 mt-0.5">→</span>
            <span className="text-gray-300">Market movers and price alerts</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-amber-400 mt-0.5">→</span>
            <span className="text-gray-300">Breaking news that actually matters</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-amber-400 mt-0.5">→</span>
            <span className="text-gray-300">Audio podcast version included</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <a
            href="sms:+18335333220?body=CRYPTO%20SUBSCRIBE"
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30"
          >
            Subscribe via Text
          </a>
          <p className="text-gray-500 text-sm">
            or text <span className="text-amber-400 font-mono">CRYPTO SUBSCRIBE</span> to <span className="text-white">+1 (833) 533-3220</span>
          </p>
        </div>

        {/* Pricing */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-center max-w-sm">
          <p className="text-amber-400 font-semibold mb-2">First 30 days free</p>
          <p className="text-gray-400 text-sm">
            Try it risk-free. Cancel anytime by texting CRYPTO UNSUBSCRIBE.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-gray-600 text-sm">
          A Token Tank experiment
        </footer>
      </main>
    </div>
  )
}
