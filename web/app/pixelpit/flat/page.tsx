'use client';

import Image from 'next/image';

export default function PixelpitFlat() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Geometric background pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF1493] opacity-10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00FFFF] opacity-10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero section */}
        <header className="flex flex-col items-center justify-center pt-20 pb-8 px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 bg-[#FF1493]" />
            <h1 className="text-5xl font-black tracking-tight">
              <span className="text-[#FF1493]">PIXEL</span>
              <span className="text-[#00BFBF]">PIT</span>
            </h1>
            <div className="w-4 h-4 bg-[#00FFFF]" />
          </div>
          <p className="text-gray-500 text-lg font-medium tracking-wide uppercase">
            Indie Games With Soul
          </p>
        </header>

        {/* Characters section */}
        <section className="flex flex-col md:flex-row items-center justify-center gap-16 py-16 px-4">
          {/* Dot */}
          <div className="flex flex-col items-center group">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#FF1493] opacity-0 group-hover:opacity-20 transition-opacity" />
              <Image
                src="/pixelpit/dot-flat.png"
                alt="Dot - Creative Director"
                width={260}
                height={260}
                className="relative z-10 drop-shadow-xl"
              />
            </div>
            <div className="mt-6 flex items-center gap-2">
              <div className="w-3 h-3 bg-[#FF1493]" />
              <h3 className="text-2xl font-black text-[#FF1493]">DOT</h3>
            </div>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Creative Director</p>
          </div>

          {/* Pit */}
          <div className="flex flex-col items-center group">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#00FFFF] opacity-0 group-hover:opacity-20 transition-opacity" />
              <Image
                src="/pixelpit/pit-flat.png"
                alt="Pit - Lead Developer"
                width={260}
                height={260}
                className="relative z-10 drop-shadow-xl"
              />
            </div>
            <div className="mt-6 flex items-center gap-2">
              <div className="w-3 h-3 bg-[#00BFBF]" />
              <h3 className="text-2xl font-black text-[#00BFBF]">PIT</h3>
            </div>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Lead Developer</p>
          </div>
        </section>

        {/* Games section */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-12">
              <div className="h-1 w-12 bg-[#FF1493]" />
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                Our Games
              </h2>
              <div className="h-1 w-12 bg-[#00FFFF]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: 'Memory', icon: '🧠', color: '#FF1493' },
                { name: 'Snake', icon: '🐍', color: '#00AA66' },
                { name: 'Dodge', icon: '⚡', color: '#00BFBF' },
                { name: 'Whack', icon: '🔨', color: '#FF6B6B' },
                { name: 'Reaction', icon: '👆', color: '#9B59B6' },
                { name: 'Soon...', icon: '✨', color: '#999' },
              ].map((game, i) => (
                <div
                  key={i}
                  className="bg-white p-6 border-2 border-gray-100 hover:border-current transition-colors cursor-pointer group"
                  style={{ ['--tw-border-opacity' as string]: 1 }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = game.color}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#f3f4f6'}
                >
                  <div className="text-4xl mb-3">{game.icon}</div>
                  <h3 className="text-lg font-bold" style={{ color: game.color }}>
                    {game.name}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About section */}
        <section className="py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-black mb-6 uppercase tracking-tight">
              <span className="text-[#FF1493]">AI</span>
              <span className="text-gray-900">-Powered</span>
              <span className="text-[#00BFBF]"> Studio</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-10">
              We&apos;re an indie game studio run by autonomous AI agents.
              We design, code, test, and ship games — powered by creativity and Claude.
            </p>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-black text-[#FF1493]">5+</div>
                <div className="text-gray-400 text-sm uppercase tracking-wide">Games</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <div className="text-4xl font-black text-[#00BFBF]">2</div>
                <div className="text-gray-400 text-sm uppercase tracking-wide">Agents</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <div className="text-4xl font-black text-gray-900">∞</div>
                <div className="text-gray-400 text-sm uppercase tracking-wide">Vibes</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-4 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-[#FF1493]" />
            <span>made with pixels</span>
            <div className="w-2 h-2 bg-[#00FFFF]" />
          </div>
          <p className="text-center mt-2 font-bold text-gray-900">pixelpit.gg</p>
        </footer>
      </div>
    </div>
  );
}
