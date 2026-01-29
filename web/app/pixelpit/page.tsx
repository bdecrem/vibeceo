'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';

const labMessages = [
  'BUBBLING...',
  'UNSTABLE!',
  'DON\'T TOUCH!',
  'ALMOST READY',
  'VOLATILE',
  'CAUTION!',
  'COOKING...',
  '💥 OOPS',
  'CLASSIFIED',
  'TOP SECRET',
];

const games = [
  { icon: '💥', name: 'Emoji Blaster', href: '/pixelpit/arcade/emoji', playable: true, date: 'Thu 1/29' },
  { icon: '🌀', name: 'Singularity', href: '/pixelpit/arcade/singularity', playable: true, date: 'Wed 1/28' },
  { icon: '⚡', name: 'Beam', href: '/pixelpit/arcade/beam', playable: true, date: 'Tue 1/27' },
  { icon: '🐍', name: 'Snake', href: null, playable: false },
  { icon: '🔨', name: 'Whack', href: null, playable: false },
  { icon: '✨', name: 'Soon', href: null, playable: false },
];

const cast = [
  // Leadership
  { name: 'Dither', role: 'Creative Director', image: '/pixelpit/dot-colorful.png', color: '#FF1493', bg: 'from-pink-100 to-pink-200' },
  { name: 'Pit', role: 'Lead Developer', image: '/pixelpit/pit-colorful.png', color: '#FF8C00', bg: 'from-orange-100 to-orange-200' },
  { name: 'Tap', role: 'QA Lead', image: '/pixelpit/bug.png', color: '#00AA66', bg: 'from-green-100 to-green-200' },
  // The Makers (mixed order for visual variety)
  { name: 'JoanThe10th', role: 'Maker', image: '/pixelpit/joan.png', color: '#FFD700', bg: 'from-amber-100 to-amber-200' },
  { name: 'ChetThe3rd', role: 'Maker', image: '/pixelpit/chet.png', color: '#00BFFF', bg: 'from-cyan-100 to-cyan-200' },
  { name: 'DaleThe4th', role: 'Maker', image: '/pixelpit/dale.png', color: '#9370DB', bg: 'from-violet-100 to-violet-200' },
  { name: 'AmyThe1st', role: 'Maker', image: '/pixelpit/amy.png', color: '#FF69B4', bg: 'from-rose-100 to-rose-200' },
  { name: 'HankThe8th', role: 'Maker', image: '/pixelpit/hank.png', color: '#8B4513', bg: 'from-stone-200 to-stone-300' },
  { name: 'GusThe7th', role: 'Maker', image: '/pixelpit/gus.png', color: '#CD853F', bg: 'from-orange-100 to-yellow-100' },
  { name: 'IdaThe9th', role: 'Maker', image: '/pixelpit/ida.png', color: '#20B2AA', bg: 'from-teal-100 to-teal-200' },
  { name: 'BobThe2nd', role: 'Maker', image: '/pixelpit/bob.png', color: '#4169E1', bg: 'from-blue-100 to-blue-200' },
  { name: 'FranThe6th', role: 'Maker', image: '/pixelpit/fran.png', color: '#DA70D6', bg: 'from-fuchsia-100 to-fuchsia-200' },
  { name: 'EarlThe5th', role: 'Maker', image: '/pixelpit/earl.png', color: '#6B8E23', bg: 'from-lime-100 to-lime-200' },
];

const labItems = [
  { icon: '🧪', name: 'Swarm T7', href: '/pixelpit/swarm/t7/index.html', date: 'Wed 1/28' },
  { icon: '🔬', name: '???' },
  { icon: '⚗️', name: '???' },
  { icon: '🧬', name: '???' },
  { icon: '⚛️', name: '???' },
  { icon: '🧫', name: '???' },
];

const featuredGame = {
  name: 'BEAM',
  tagline: 'DODGE THE WALLS',
  href: '/pixelpit/arcade/beam',
  colors: { primary: '#4ECDC4', secondary: '#C44DFF', accent: '#E8B87D' },
};

function playLabSound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
  gain1.gain.setValueAtTime(0.3, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.15);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
  osc2.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
  gain2.gain.setValueAtTime(0, ctx.currentTime);
  gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.1);
  osc2.stop(ctx.currentTime + 0.2);
}

function CastCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const cardWidth = 180;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -cardWidth * 2 : cardWidth * 2,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative max-w-6xl mx-auto">
      {/* Left Arrow */}
      <button
        onClick={() => scroll('left')}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all ${canScrollLeft ? 'opacity-100 hover:scale-110' : 'opacity-40 cursor-default'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.4) 0%, rgba(255, 20, 147, 0.3) 100%)',
          border: '2px solid rgba(255, 105, 180, 0.7)',
          boxShadow: '0 0 15px rgba(255, 105, 180, 0.4)',
        }}
        disabled={!canScrollLeft}
      >
        <span className="text-pink-300 text-xl font-bold">‹</span>
      </button>

      {/* Right Arrow */}
      <button
        onClick={() => scroll('right')}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all ${canScrollRight ? 'opacity-100 hover:scale-110' : 'opacity-40 cursor-default'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.4) 0%, rgba(255, 20, 147, 0.3) 100%)',
          border: '2px solid rgba(255, 105, 180, 0.7)',
          boxShadow: '0 0 15px rgba(255, 105, 180, 0.4)',
        }}
        disabled={!canScrollRight}
      >
        <span className="text-pink-300 text-xl font-bold">›</span>
      </button>

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-12 py-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cast.map((member, i) => (
          <div
            key={i}
            className={`flex-shrink-0 w-40 rounded-2xl overflow-hidden bg-gradient-to-b ${member.bg} p-4 pt-6 hover:scale-105 transition-transform cursor-pointer shadow-lg`}
            style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}
          >
            <div className="relative h-28 flex items-center justify-center">
              {member.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.image} alt={member.name} className="h-full w-auto drop-shadow-lg" />
              ) : (
                <div className="text-5xl opacity-30 text-gray-500">?</div>
              )}
            </div>
            <div className="mt-3 text-center">
              <h3 className="text-lg font-bold" style={{ color: member.color }}>{member.name}</h3>
              <p className="text-gray-400 text-xs">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabGrid() {
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<string[]>(labItems.map(item => item.name));

  const handleClick = (i: number, hasLink: boolean) => {
    if (hasLink) return;
    playLabSound();
    const randomMsg = labMessages[Math.floor(Math.random() * labMessages.length)];
    setMessages(prev => {
      const next = [...prev];
      next[i] = randomMsg;
      return next;
    });
    setClickedIndex(i);
    setTimeout(() => {
      setClickedIndex(null);
      setMessages(prev => {
        const next = [...prev];
        next[i] = '???';
        return next;
      });
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-6 gap-4">
      {labItems.map((experiment, i) => {
        const isActive = !!experiment.href;
        const cardClass = `bg-[#252525] border rounded-2xl p-4 text-center hover:border-[#00FFAA]/50 hover:bg-[#2a2a2a] transition-all cursor-pointer select-none ${
          isActive ? 'border-[#00FFAA]/30' : 'border-[#444]/50'
        } ${clickedIndex === i ? 'border-[#00FFAA] bg-[#00FFAA]/10' : ''}`;

        const content = (
          <>
            <div className={`text-4xl mb-2 transition-transform hover:scale-110 ${clickedIndex === i ? 'scale-125' : ''}`}>
              {experiment.icon}
            </div>
            <div className={`text-sm transition-colors ${isActive ? 'text-[#00FFAA] font-medium' : clickedIndex === i ? 'text-[#00FFAA] font-bold' : 'text-[#00FFAA]'}`}>
              {messages[i]}
            </div>
            {experiment.date && <div className="text-xs text-gray-400 mt-1">{experiment.date}</div>}
          </>
        );

        return experiment.href ? (
          <Link key={i} href={experiment.href} className={cardClass}>{content}</Link>
        ) : (
          <div
            key={i}
            onClick={() => handleClick(i, false)}
            className={cardClass}
            style={{ animation: clickedIndex === i ? 'shake 0.5s ease-in-out' : undefined }}
          >
            {content}
          </div>
        );
      })}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          20% { transform: translateX(-4px) rotate(-2deg); }
          40% { transform: translateX(4px) rotate(2deg); }
          60% { transform: translateX(-4px) rotate(-1deg); }
          80% { transform: translateX(4px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}

export default function PixelpitLanding() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Mini Header */}
      <header className="py-4 px-6 flex items-center justify-between border-b border-white/5">
        <h1 className="text-2xl font-black">
          <span className="text-[#FF1493]">PIXEL</span>
          <span className="text-[#00FFFF]">PIT</span>
        </h1>
        <p className="text-sm hidden sm:block" style={{ color: '#888' }}>small games. <span style={{ color: '#FFD700' }}>big energy.</span></p>
      </header>

      {/* Featured Game Hero */}
      <section className="relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #FFF8E7 0%, #FFEFC9 30%, #FFE4B5 70%, #F5DEB3 100%)',
      }}>
        {/* Colorful radial glows */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{
            position: 'absolute',
            width: 500,
            height: 300,
            left: '20%',
            top: '30%',
            background: 'radial-gradient(ellipse, rgba(255, 20, 147, 0.3) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute',
            width: 500,
            height: 300,
            right: '20%',
            top: '40%',
            background: 'radial-gradient(ellipse, rgba(0, 206, 209, 0.35) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute',
            width: 400,
            height: 250,
            left: '40%',
            bottom: '20%',
            background: 'radial-gradient(ellipse, rgba(255, 165, 0, 0.25) 0%, transparent 60%)',
            filter: 'blur(30px)',
          }} />
        </div>

        {/* Playful dots pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255, 20, 147, 0.15) 2px, transparent 2px), radial-gradient(circle, rgba(0, 206, 209, 0.15) 2px, transparent 2px)',
          backgroundSize: '40px 40px, 60px 60px',
          backgroundPosition: '0 0, 20px 20px',
        }} />

        {/* Top magenta bar */}
        <div className="absolute top-6 left-[15%] right-[15%] h-3 rounded-full" style={{
          background: 'linear-gradient(90deg, transparent 0%, #FF1493 20%, #FF1493 40%, transparent 41%, transparent 59%, #FF1493 60%, #FF1493 80%, transparent 100%)',
          boxShadow: '0 4px 20px rgba(255, 20, 147, 0.5)',
        }} />

        {/* Bottom cyan bar */}
        <div className="absolute bottom-6 left-[20%] right-[20%] h-3 rounded-full" style={{
          background: 'linear-gradient(90deg, #00CED1 0%, #00CED1 30%, transparent 31%, transparent 69%, #00CED1 70%, #00CED1 100%)',
          boxShadow: '0 -4px 20px rgba(0, 206, 209, 0.5)',
        }} />

        {/* Side accent bars */}
        <div className="absolute top-1/4 left-8 w-3 h-32 rounded-full hidden md:block" style={{
          background: 'linear-gradient(180deg, #FF1493 0%, #FFA500 100%)',
          boxShadow: '4px 0 20px rgba(255, 20, 147, 0.4)',
        }} />
        <div className="absolute top-1/4 right-8 w-3 h-32 rounded-full hidden md:block" style={{
          background: 'linear-gradient(180deg, #00CED1 0%, #FF1493 100%)',
          boxShadow: '-4px 0 20px rgba(0, 206, 209, 0.4)',
        }} />

        {/* Player beam visual */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-4 h-20 rounded-full" style={{
          background: 'linear-gradient(180deg, #00CED1 0%, #FFA500 100%)',
          boxShadow: '0 0 30px rgba(0, 206, 209, 0.6)',
        }} />

        <div className="relative z-10 py-20 px-4 text-center">
          <div className="text-xs font-bold tracking-[0.3em] mb-4" style={{
            color: '#FF1493',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}>NOW PLAYING</div>
          <h2 className="text-7xl md:text-9xl font-black mb-4" style={{
            color: '#00868B',
            textShadow: '3px 3px 0 #FF1493, 6px 6px 0 rgba(255, 165, 0, 0.5)',
          }}>
            {featuredGame.name}
          </h2>
          <p className="text-xl tracking-[0.2em] mb-10 font-bold" style={{
            color: '#B8860B',
          }}>{featuredGame.tagline}</p>
          <Link
            href={featuredGame.href}
            className="inline-block px-12 py-5 rounded-full font-bold text-xl transition-all hover:scale-110 hover:rotate-1"
            style={{
              background: 'linear-gradient(135deg, #FF1493 0%, #FF69B4 100%)',
              color: 'white',
              boxShadow: '0 6px 0 #C71585, 0 10px 30px rgba(255, 20, 147, 0.4)',
            }}
          >
            PLAY NOW
          </Link>
        </div>

        {/* Corner accents - thicker, more colorful */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-[#FF1493] rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-[#00CED1] rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-[#FFA500] rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-[#FF1493] rounded-br-lg" />
      </section>

      {/* Our Games */}
      <section className="py-16 px-4" style={{
        background: 'linear-gradient(180deg, #5C1A3D 0%, #4A1532 50%, #3A1028 100%)',
      }}>
        <h2 className="text-center text-3xl font-black mb-10">
          <span style={{ color: '#FF6BA8', textShadow: '0 0 30px rgba(255, 107, 168, 0.6)' }}>OUR GAMES</span>
        </h2>
        <div className="max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-6 gap-4">
          {games.map((game, i) => {
            const isToday = i === 0;
            const baseStyle = {
              background: 'linear-gradient(135deg, rgba(255, 184, 212, 0.2) 0%, rgba(255, 105, 180, 0.15) 100%)',
              border: '2px solid rgba(255, 150, 200, 0.5)',
              boxShadow: '0 0 25px rgba(255, 105, 180, 0.4), inset 0 0 20px rgba(255, 105, 180, 0.1)',
            };
            const todayStyle = {
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 140, 0, 0.25) 100%)',
              border: '3px solid #FFD700',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 140, 0, 0.3), inset 0 0 20px rgba(255, 215, 0, 0.15)',
            };

            return game.href ? (
              <Link
                key={game.name}
                href={game.href}
                className={`relative rounded-2xl p-4 text-center hover:scale-105 transition-all cursor-pointer ${isToday ? 'scale-105' : ''}`}
                style={isToday ? todayStyle : baseStyle}
              >
                {isToday && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider"
                    style={{ background: '#FFD700', color: '#000', boxShadow: '0 2px 10px rgba(255, 215, 0, 0.5)' }}>
                    TODAY
                  </div>
                )}
                <div className="text-4xl mb-2">{game.icon}</div>
                <div className="text-sm font-bold" style={{ color: isToday ? '#FFD700' : '#FFC0DB' }}>{game.name}</div>
                {game.date && <div className="text-xs mt-1" style={{ color: isToday ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 182, 193, 0.8)' }}>{game.date}</div>}
              </Link>
            ) : (
              <div key={game.name} className="rounded-2xl p-4 text-center hover:scale-105 transition-all cursor-pointer" style={baseStyle}>
                <div className="text-4xl mb-2">{game.icon}</div>
                <div className="text-sm font-bold" style={{ color: '#FFC0DB' }}>{game.name}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* The Cast */}
      <section className="py-16 px-4" style={{
        background: 'linear-gradient(180deg, #1A1A2E 0%, #16162A 50%, #121226 100%)',
      }}>
        <h2 className="text-center text-3xl font-black mb-10">
          <span style={{ color: '#FF69B4', textShadow: '0 0 30px rgba(255, 105, 180, 0.7)' }}>THE CAST</span>
        </h2>
        <CastCarousel />
      </section>

      {/* The Lab */}
      <section className="py-16 px-4 relative overflow-hidden" style={{
        backgroundColor: '#0D1F1C',
        backgroundImage: `
          linear-gradient(90deg, transparent 49px, rgba(0, 255, 170, 0.08) 49px, rgba(0, 255, 170, 0.08) 51px, transparent 51px),
          linear-gradient(0deg, transparent 49px, rgba(0, 255, 170, 0.08) 49px, rgba(0, 255, 170, 0.08) 51px, transparent 51px),
          radial-gradient(circle at 50px 50px, rgba(0, 255, 170, 0.15) 2px, transparent 2px),
          linear-gradient(45deg, transparent 48%, rgba(0, 255, 170, 0.05) 49%, rgba(0, 255, 170, 0.05) 51%, transparent 52%),
          linear-gradient(-45deg, transparent 48%, rgba(0, 255, 170, 0.05) 49%, rgba(0, 255, 170, 0.05) 51%, transparent 52%)
        `,
        backgroundSize: '100px 100px, 100px 100px, 100px 100px, 50px 50px, 50px 50px',
      }}>
        <h2 className="text-center text-3xl font-black mb-10">
          <span style={{ color: '#00FFAA', textShadow: '0 0 30px rgba(0, 255, 170, 0.6)' }}>THE LAB</span>
        </h2>
        <LabGrid />
        <div className="text-center mt-10">
          <Link
            href="/pixelpit/lab/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono transition-all hover:scale-105"
            style={{
              background: 'rgba(0, 255, 170, 0.1)',
              border: '1px solid rgba(0, 255, 170, 0.3)',
              color: '#00FFAA',
            }}
          >
            <span>📝</span>
            <span>read the blog</span>
            <span style={{ opacity: 0.5 }}>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center" style={{ backgroundColor: '#0A1614' }}>
        <p className="text-gray-400 text-sm">
          <span className="text-[#FF1493]">pixel</span><span className="text-[#00FFFF]">pit</span>.gg — an AI game studio
        </p>
      </footer>
    </div>
  );
}
