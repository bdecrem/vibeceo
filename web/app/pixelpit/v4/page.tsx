'use client';

import Image from 'next/image';

export default function PixelpitV4() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-[#FFE4B5] text-gray-800 overflow-hidden">
      {/* Floating pixels background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${8 + Math.random() * 12}px`,
              height: `${8 + Math.random() * 12}px`,
              backgroundColor: ['#FF1493', '#00FFFF', '#FFD700', '#00FF88', '#FF6B6B', '#9B59B6', '#FF8C00'][i % 7],
              opacity: 0.15,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero section */}
        <header className="flex flex-col items-center justify-center pt-16 pb-8 px-4">
          <Image
            src="/pixelpit/pixelpit-logo-dark.png"
            alt="Pixelpit"
            width={380}
            height={110}
            className="mb-6 drop-shadow-lg"
            priority
          />
          <p className="text-[#E67E00] text-xl font-bold tracking-wide">
            small games. big energy.
          </p>
        </header>

        {/* Characters section */}
        <section className="flex flex-col md:flex-row items-center justify-center gap-12 py-12 px-4">
          {/* Dot */}
          <div className="flex flex-col items-center group">
            <div className="relative bg-white rounded-3xl p-6 shadow-xl border-4 border-[#FF1493]/20 hover:border-[#FF1493] transition-all hover:scale-105">
              <Image
                src="/pixelpit/dot-colorful.png"
                alt="Dot - Creative Director"
                width={240}
                height={240}
                className="drop-shadow-lg"
              />
            </div>
            <div className="mt-4 bg-[#FF1493] text-white px-6 py-2 rounded-full shadow-lg">
              <h3 className="text-lg font-bold">Dot</h3>
            </div>
            <p className="text-gray-500 text-sm mt-2">Creative Director</p>
          </div>

          {/* Pit */}
          <div className="flex flex-col items-center group">
            <div className="relative bg-white rounded-3xl p-6 shadow-xl border-4 border-[#FF8C00]/20 hover:border-[#FF8C00] transition-all hover:scale-105">
              <Image
                src="/pixelpit/pit-colorful.png"
                alt="Pit - Lead Developer"
                width={240}
                height={240}
                className="drop-shadow-lg"
              />
            </div>
            <div className="mt-4 bg-[#FF8C00] text-white px-6 py-2 rounded-full shadow-lg">
              <h3 className="text-lg font-bold">Pit</h3>
            </div>
            <p className="text-gray-500 text-sm mt-2">Lead Developer</p>
          </div>
        </section>

        {/* Games section */}
        <section className="py-16 px-4">
          <h2 className="text-center text-3xl font-bold mb-12 text-[#E67E00]">
            Our Games
          </h2>
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'Memory Match', color: '#FF1493', icon: '🧠', bg: '#FFF0F5' },
              { name: 'Snake', color: '#00AA66', icon: '🐍', bg: '#F0FFF4' },
              { name: 'Dodge', color: '#0099CC', icon: '⚡', bg: '#F0FFFF' },
              { name: 'Whack-a-Mole', color: '#E67E00', icon: '🔨', bg: '#FFFAF0' },
              { name: 'Reaction', color: '#9B59B6', icon: '👆', bg: '#F5F0FF' },
              { name: 'Coming Soon', color: '#AAA', icon: '✨', bg: '#F8F8F8' },
            ].map((game, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 border-2 hover:scale-105 transition-all cursor-pointer shadow-md hover:shadow-xl"
                style={{
                  backgroundColor: game.bg,
                  borderColor: game.color + '40'
                }}
              >
                <div className="text-4xl mb-2">{game.icon}</div>
                <h3 className="text-md font-bold" style={{ color: game.color }}>
                  {game.name}
                </h3>
              </div>
            ))}
          </div>
        </section>

        {/* About section */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-10 shadow-xl border-2 border-[#FFD700]/30">
            <h2 className="text-3xl font-bold mb-6 text-center text-[#E67E00]">
              What is Pixelpit?
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed text-center mb-8">
              We&apos;re an AI-powered indie game studio making small, fun, polished games
              with personality. Our team of autonomous agents designs, codes, tests, and ships
              games — powered by creativity and Claude.
            </p>
            <div className="flex justify-center gap-12 text-center">
              <div className="bg-[#E0F7FF] rounded-2xl p-4 px-6">
                <div className="text-3xl font-bold text-[#0099CC]">5+</div>
                <div className="text-gray-500 text-sm">Games</div>
              </div>
              <div className="bg-[#FFE4F0] rounded-2xl p-4 px-6">
                <div className="text-3xl font-bold text-[#FF1493]">2</div>
                <div className="text-gray-500 text-sm">Agents</div>
              </div>
              <div className="bg-[#FFF4E0] rounded-2xl p-4 px-6">
                <div className="text-3xl font-bold text-[#E67E00]">∞</div>
                <div className="text-gray-500 text-sm">Vibes</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-4 text-center">
          <p className="text-gray-400 text-sm">made with pixels and love</p>
          <p className="mt-2 text-[#E67E00] font-bold text-lg">pixelpit.gg</p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(45deg);
          }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
