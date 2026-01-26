'use client';

const team = [
  {
    name: 'Dot',
    role: 'Creative Director',
    image: '/pixelpit/dot-colorful.png',
    color: '#FF1493',
    bg: 'from-pink-100 to-pink-200',
    quote: 'Make it pretty.',
  },
  {
    name: 'Pit',
    role: 'Lead Developer',
    image: '/pixelpit/pit-colorful.png',
    color: '#FF8C00',
    bg: 'from-orange-100 to-orange-200',
    quote: 'Ship it.',
  },
  {
    name: 'Bug',
    role: 'QA Lead',
    image: '/pixelpit/bug.png',
    color: '#00AA66',
    bg: 'from-green-100 to-green-200',
    quote: 'Found one.',
  },
  {
    name: 'Chip',
    role: 'Audio Lead',
    image: '/pixelpit/chip.png',
    color: '#8B5CF6',
    bg: 'from-purple-100 to-purple-200',
    quote: 'Turn it up.',
  },
];

export default function PixelpitLanding() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Hero */}
      <header className="py-20 px-4 text-center">
        <h1 className="text-6xl font-black mb-4">
          <span className="text-[#FF1493]">PIXEL</span>
          <span className="text-[#00FFFF]">PIT</span>
        </h1>
        <p className="text-2xl text-gray-400 font-medium">
          small games. big energy.
        </p>
      </header>

      {/* Team Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {team.map((member) => (
            <div
              key={member.name}
              className={`relative rounded-3xl overflow-hidden bg-gradient-to-b ${member.bg} p-6 pt-8 group hover:scale-105 transition-transform cursor-pointer`}
            >
              {/* Character */}
              <div className="relative z-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-auto drop-shadow-xl"
                />
              </div>

              {/* Info */}
              <div className="mt-4 text-center">
                <h3
                  className="text-2xl font-black"
                  style={{ color: member.color }}
                >
                  {member.name}
                </h3>
                <p className="text-gray-600 text-sm font-medium">
                  {member.role}
                </p>
                <p className="mt-2 text-gray-500 text-xs italic">
                  &ldquo;{member.quote}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Games */}
      <section className="py-20 px-4 bg-[#1a1a2e]">
        <h2 className="text-center text-4xl font-black mb-12">
          <span className="text-[#FFD700]">OUR GAMES</span>
        </h2>
        <div className="max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { icon: '🧠', name: 'Memory' },
            { icon: '🐍', name: 'Snake' },
            { icon: '⚡', name: 'Dodge' },
            { icon: '🔨', name: 'Whack' },
            { icon: '👆', name: 'Reaction' },
            { icon: '✨', name: 'Soon' },
          ].map((game) => (
            <div
              key={game.name}
              className="bg-[#2a2a4e] rounded-2xl p-4 text-center hover:bg-[#3a3a5e] transition-colors cursor-pointer"
            >
              <div className="text-4xl mb-2">{game.icon}</div>
              <div className="text-sm text-gray-400">{game.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xl text-gray-400 leading-relaxed">
            Four creators who never get tired. For real.
            <br />
            One studio. Infinite games.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-800 text-center">
        <p className="text-[#FFD700] font-bold text-lg">pixelpit.gg</p>
      </footer>
    </div>
  );
}
