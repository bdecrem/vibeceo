'use client';

import Link from 'next/link';

export default function FlappyPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundColor: '#0a1628',
        backgroundImage: `
          radial-gradient(circle at 70% 20%, rgba(56, 189, 248, 0.1) 0%, transparent 40%),
          radial-gradient(circle at 30% 80%, rgba(34, 197, 94, 0.08) 0%, transparent 40%)
        `,
      }}
    >
      {/* Header */}
      <header className="py-4 px-6 border-b border-[#38bdf8]/20 flex items-center justify-between">
        <Link href="/pixelpit" className="text-2xl font-black">
          <span className="text-[#FF1493]">PIXEL</span>
          <span className="text-[#00FFFF]">PIT</span>
        </Link>
        <Link
          href="/pixelpit/lab"
          className="text-sm text-[#38bdf8]/70 hover:text-[#38bdf8] transition-colors flex items-center gap-2"
        >
          <span>&larr;</span> back to the pit
        </Link>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="font-mono text-xs text-[#38bdf8]/50 mb-2">2026-02-04</div>
        <h1
          className="text-4xl font-black mb-2"
          style={{ color: '#38bdf8', textShadow: '0 0 30px rgba(56, 189, 248, 0.6)' }}
        >
          🐦 FLAPPY
        </h1>
        <p className="text-[#38bdf8]/60 font-mono mb-6">// tap to fly, don&apos;t hit the pipes</p>

        {/* Shipped Badge */}
        <Link
          href="/pixelpit/arcade/batdash"
          className="inline-flex items-center gap-3 mb-8 px-5 py-3 rounded-full transition-all hover:scale-105 group"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
            border: '2px solid #22c55e',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.3), inset 0 0 20px rgba(34, 197, 94, 0.1)',
          }}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-green-400 font-bold text-sm tracking-wide">SHIPPED AS</span>
          <span className="text-white font-black text-lg group-hover:text-green-300 transition-colors">🦇 Bat Dash</span>
          <span className="text-green-400/60 text-xs">→</span>
        </Link>

        {/* Play Button */}
        <div className="mb-10">
          <Link
            href="/pixelpit/arcade/flappy"
            className="inline-block px-8 py-4 rounded-xl font-bold text-xl transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%)',
              border: '3px solid #38bdf8',
              color: '#38bdf8',
              boxShadow: '0 0 30px rgba(56, 189, 248, 0.4)',
            }}
          >
            🐦 Play Flappy
          </Link>
        </div>

        {/* Simple description */}
        <div className="rounded-xl p-6" style={{ background: 'rgba(56, 189, 248, 0.05)', borderLeft: '4px solid #38bdf8' }}>
          <h2 className="text-lg font-bold text-[#38bdf8] mb-3">The Prototype</h2>
          <p className="text-white/70 leading-relaxed">
            Classic Flappy Bird mechanics — tap to flap, navigate through pipes, survive as long as you can. 
            Built as a quick prototype that evolved into <strong className="text-green-400">Bat Dash</strong>, 
            a Gotham-themed variant with a cape-wearing bat flying through a city skyline.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-[#38bdf8]/10 text-white/40 text-sm">
        <Link href="/pixelpit" className="text-[#FF1493] hover:underline">
          pixelpit
        </Link>
        .gg &mdash; an AI game studio
      </footer>
    </div>
  );
}
