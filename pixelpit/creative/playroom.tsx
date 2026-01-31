/**
 * PIXELPIT PLAYROOM — Interactive Component Library
 *
 * Visual demo of the Playroom design system.
 * All tokens imported from theme.ts
 */

import React, { useState } from 'react';
import { COLORS, CHARACTERS, SHADOWS, TW } from './theme';

// =============================================================================
// TYPES
// =============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'happy' | 'mint' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
type CardAccent = 'pink' | 'cyan' | 'yellow';

// =============================================================================
// COMPONENTS
// =============================================================================

const PixelPitPlayroom = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [glitchHover, setGlitchHover] = useState(false);

  // ---------------------------------------------------------------------------
  // Tab Button
  // ---------------------------------------------------------------------------
  const TabButton = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-2 text-xs uppercase tracking-widest transition-all border-2 ${TW.pixelText} ${
        activeTab === id
          ? 'bg-pink-400 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          : 'bg-white text-slate-400 border-slate-300 hover:border-pink-300 hover:text-pink-500'
      }`}
    >
      {label}
    </button>
  );

  // ---------------------------------------------------------------------------
  // Color Swatch
  // ---------------------------------------------------------------------------
  const ColorSwatch = ({ name, hex }: { name: string; hex: string }) => (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-12 h-12 border-2 border-black"
        style={{ backgroundColor: hex, boxShadow: SHADOWS.md }}
      />
      <span className={`text-xs text-slate-700 ${TW.pixelText}`}>{name}</span>
      <span className={`text-xs text-slate-400 ${TW.pixelText}`}>{hex}</span>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Pixel Button
  // ---------------------------------------------------------------------------
  const PixelButton = ({
    variant = 'primary',
    size = 'md',
    children,
  }: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: React.ReactNode;
  }) => {
    const baseStyles = `${TW.pixelText} uppercase tracking-wider border-2 border-black transition-all active:translate-x-px active:translate-y-px active:shadow-none`;

    const sizeStyles = {
      sm: 'px-3 py-1 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantStyles = {
      primary: `bg-[${COLORS.primary.bubblegum}] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:brightness-110`,
      secondary: `bg-[${COLORS.primary.splash}] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:brightness-110`,
      happy: `bg-[${COLORS.primary.sunshine}] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:brightness-110`,
      mint: `bg-[${COLORS.primary.mint}] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:brightness-110`,
      ghost: 'bg-white text-slate-500 border-slate-300 shadow-none hover:bg-slate-50 hover:text-pink-500 hover:border-pink-300',
    };

    // Tailwind can't parse dynamic classes, so we use inline styles for colors
    const bgColors: Record<ButtonVariant, string> = {
      primary: COLORS.primary.bubblegum,
      secondary: COLORS.primary.splash,
      happy: COLORS.primary.sunshine,
      mint: COLORS.primary.mint,
      ghost: '#ffffff',
    };

    const textColors: Record<ButtonVariant, string> = {
      primary: '#ffffff',
      secondary: '#000000',
      happy: '#000000',
      mint: '#000000',
      ghost: '#64748b',
    };

    return (
      <button
        className={`${baseStyles} ${sizeStyles[size]} ${variant === 'ghost' ? variantStyles.ghost : ''}`}
        style={
          variant !== 'ghost'
            ? {
                backgroundColor: bgColors[variant],
                color: textColors[variant],
                boxShadow: SHADOWS.lg,
              }
            : {}
        }
      >
        {children}
      </button>
    );
  };

  // ---------------------------------------------------------------------------
  // Play Card
  // ---------------------------------------------------------------------------
  const PlayCard = ({
    children,
    className = '',
    accent = 'pink',
  }: {
    children: React.ReactNode;
    className?: string;
    accent?: CardAccent;
  }) => {
    const accents = {
      pink: 'border-pink-200',
      cyan: 'border-cyan-200',
      yellow: 'border-yellow-200',
    };

    return (
      <div
        className={`bg-white border-2 ${accents[accent]} ${className}`}
        style={{ boxShadow: SHADOWS.soft.lg }}
      >
        {children}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Pixel Score
  // ---------------------------------------------------------------------------
  const PixelScore = ({
    score,
    label,
    color = 'pink',
  }: {
    score: number;
    label: string;
    color?: 'pink' | 'cyan' | 'yellow';
  }) => {
    const colors = {
      pink: 'text-pink-500',
      cyan: 'text-cyan-500',
      yellow: 'text-yellow-500',
    };

    return (
      <div className="text-center">
        <div className={`text-[10px] text-slate-400 uppercase tracking-widest ${TW.pixelText}`}>
          {label}
        </div>
        <div
          className={`text-3xl ${colors[color]} ${TW.pixelText}`}
          style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}
        >
          {String(score).padStart(6, '0')}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Pixel Health
  // ---------------------------------------------------------------------------
  const PixelHealth = ({
    current,
    max,
    color = 'pink',
  }: {
    current: number;
    max: number;
    color?: 'pink' | 'cyan' | 'red';
  }) => {
    const segments = Array.from({ length: max }, (_, i) => i < current);
    const colors = {
      pink: 'bg-pink-400',
      cyan: 'bg-cyan-400',
      red: 'bg-red-400',
    };

    return (
      <div>
        <div className={`text-[10px] text-slate-400 uppercase tracking-widest mb-1 ${TW.pixelText}`}>
          HP {current}/{max}
        </div>
        <div className="flex gap-1">
          {segments.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-5 border border-black ${
                filled ? `${colors[color]}` : 'bg-slate-100'
              }`}
              style={filled ? { boxShadow: SHADOWS.inset } : {}}
            />
          ))}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Pixel Timer
  // ---------------------------------------------------------------------------
  const PixelTimer = ({ seconds }: { seconds: number }) => (
    <div
      className="flex items-center gap-1 bg-yellow-100 border-2 border-black px-3 py-1"
      style={{ boxShadow: SHADOWS.md }}
    >
      <span className="text-yellow-600">▶</span>
      <span className={`text-xl text-yellow-600 ${TW.pixelText}`}>
        {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
      </span>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Pixel Item
  // ---------------------------------------------------------------------------
  const PixelItem = ({
    icon,
    label,
    color,
  }: {
    icon: string;
    label: string;
    color: string;
  }) => (
    <div className="relative group cursor-pointer">
      <div
        className="w-12 h-12 border-2 border-black flex items-center justify-center text-xl transition-transform group-hover:-translate-y-1"
        style={{ backgroundColor: color, boxShadow: SHADOWS.md }}
      >
        <span>{icon}</span>
      </div>
      {label && (
        <div
          className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap opacity-0 group-hover:opacity-100 ${TW.pixelText}`}
        >
          {label}
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Game Card
  // ---------------------------------------------------------------------------
  const GameCard = ({
    title,
    icon,
    color,
    bgColor,
  }: {
    title: string;
    icon: string;
    color: string;
    bgColor: string;
  }) => (
    <div
      className="relative cursor-pointer group overflow-hidden border-2 border-black transition-transform hover:-translate-y-1"
      style={{ backgroundColor: bgColor, boxShadow: SHADOWS.lg }}
    >
      <div className="p-4 text-center">
        <div className="text-3xl mb-2">{icon}</div>
        <div className={`text-xs uppercase tracking-wider font-bold ${TW.pixelText}`} style={{ color }}>
          {title}
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Pixel Character
  // ---------------------------------------------------------------------------
  const PixelCharacter = ({
    name,
    emoji,
    tagline,
    color,
    bgColor,
  }: {
    name: string;
    emoji: string;
    tagline: string;
    color: string;
    bgColor: string;
  }) => (
    <div className="text-center group">
      <div
        className="w-16 h-16 mx-auto mb-2 border-2 border-black flex items-center justify-center text-3xl transition-all group-hover:-translate-y-1"
        style={{ backgroundColor: bgColor, boxShadow: SHADOWS.md }}
      >
        {emoji}
      </div>
      <div className={`text-sm font-bold ${TW.pixelText}`} style={{ color }}>
        {name}
      </div>
      <div className={`text-[10px] text-slate-400 ${TW.pixelText}`}>"{tagline}"</div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Glitch Text
  // ---------------------------------------------------------------------------
  const GlitchText = ({
    children,
    className = '',
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span
      className={`relative inline-block cursor-pointer ${className}`}
      onMouseEnter={() => setGlitchHover(true)}
      onMouseLeave={() => setGlitchHover(false)}
      style={
        glitchHover
          ? { textShadow: `-2px 0 ${COLORS.primary.mint}, 2px 0 ${COLORS.primary.bubblegum}` }
          : {}
      }
    >
      {children}
    </span>
  );

  // ---------------------------------------------------------------------------
  // Marquee
  // ---------------------------------------------------------------------------
  const Marquee = ({ text }: { text: string }) => (
    <div
      className="overflow-hidden border-y-2 border-pink-200 py-1"
      style={{ backgroundColor: COLORS.pastel.blush }}
    >
      <div className={`animate-marquee whitespace-nowrap text-xs text-pink-500 ${TW.pixelText}`}>
        {text} ✦ {text} ✦ {text} ✦ {text} ✦
      </div>
    </div>
  );

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Subtle dot pattern background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <GlitchText>
            <h1 className={`text-4xl font-bold mb-1 ${TW.pixelText}`}>
              <span style={{ color: COLORS.primary.bubblegum }}>PIXEL</span>
              <span style={{ color: COLORS.primary.splash }}>PIT</span>
            </h1>
          </GlitchText>
          <p className={`text-slate-400 text-xs uppercase tracking-widest ${TW.pixelText}`}>
            playroom edition ✦ fun for everyone
          </p>
        </div>

        <Marquee text="SMALL GAMES • BIG SMILES • MADE WITH LOVE" />

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 my-6">
          <TabButton id="overview" label="Welcome" />
          <TabButton id="colors" label="Palette" />
          <TabButton id="components" label="Components" />
          <TabButton id="gameplay" label="HUD" />
          <TabButton id="mockup" label="In Action" />
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <PlayCard className="p-6" accent="pink">
                <h2 className={`text-lg text-pink-500 mb-4 flex items-center gap-2 ${TW.pixelText}`}>
                  <span className="text-cyan-500">►</span> THE VIBE
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-pink-50 p-4 border border-pink-100">
                    <div className={`text-pink-500 text-sm mb-2 ${TW.pixelText}`}>CRUNCHY</div>
                    <p className={`text-xs text-slate-500 leading-relaxed ${TW.pixelText}`}>
                      Hard pixels, sharp edges. Every element is crisp and intentional. No blur, no fuzz.
                    </p>
                  </div>
                  <div className="bg-cyan-50 p-4 border border-cyan-100">
                    <div className={`text-cyan-500 text-sm mb-2 ${TW.pixelText}`}>FRIENDLY</div>
                    <p className={`text-xs text-slate-500 leading-relaxed ${TW.pixelText}`}>
                      Bright colors, light backgrounds. Games should feel welcoming and fun.
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 border border-yellow-100">
                    <div className={`text-yellow-600 text-sm mb-2 ${TW.pixelText}`}>PLAYFUL</div>
                    <p className={`text-xs text-slate-500 leading-relaxed ${TW.pixelText}`}>
                      Subtle animations, cheerful palette. The UI should make you smile.
                    </p>
                  </div>
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="cyan">
                <h2 className={`text-lg text-pink-500 mb-4 flex items-center gap-2 ${TW.pixelText}`}>
                  <span className="text-cyan-500">►</span> DESIGN RULES
                </h2>
                <div className={`space-y-3 text-sm ${TW.pixelText}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-pink-500 mt-0.5">01</span>
                    <span className="text-slate-600">
                      <span className="text-slate-800">No rounded corners.</span> Pixels are square. That's the
                      charm.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-500 mt-0.5">02</span>
                    <span className="text-slate-600">
                      <span className="text-slate-800">Hard drop shadows.</span> 4px offset, always black. Clean and
                      punchy.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-500 mt-0.5">03</span>
                    <span className="text-slate-600">
                      <span className="text-slate-800">Pink leads.</span> It's our signature. Cyan supports.
                      Everything else accents.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5">04</span>
                    <span className="text-slate-600">
                      <span className="text-slate-800">Mono fonts only.</span> Every character same width. Retro but
                      readable.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-purple-500 mt-0.5">05</span>
                    <span className="text-slate-600">
                      <span className="text-slate-800">Light & bright.</span> White backgrounds, pastel accents. Easy
                      on the eyes.
                    </span>
                  </div>
                </div>
              </PlayCard>
            </div>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <PlayCard className="p-6" accent="pink">
                <h2 className={`text-lg text-pink-500 mb-4 ${TW.pixelText}`}>► PRIMARY</h2>
                <div className="flex flex-wrap gap-6 justify-center">
                  <ColorSwatch name="BUBBLEGUM" hex={COLORS.primary.bubblegum} />
                  <ColorSwatch name="SPLASH" hex={COLORS.primary.splash} />
                  <ColorSwatch name="SUNSHINE" hex={COLORS.primary.sunshine} />
                  <ColorSwatch name="MINT" hex={COLORS.primary.mint} />
                  <ColorSwatch name="GRAPE" hex={COLORS.primary.grape} />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="cyan">
                <h2 className={`text-lg text-pink-500 mb-4 ${TW.pixelText}`}>► PASTELS</h2>
                <div className="flex flex-wrap gap-6 justify-center">
                  <ColorSwatch name="BLUSH" hex={COLORS.pastel.blush} />
                  <ColorSwatch name="SKY" hex={COLORS.pastel.sky} />
                  <ColorSwatch name="CREAM" hex={COLORS.pastel.cream} />
                  <ColorSwatch name="FOAM" hex={COLORS.pastel.foam} />
                  <ColorSwatch name="CLOUD" hex={COLORS.pastel.cloud} />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="yellow">
                <h2 className={`text-lg text-pink-500 mb-4 ${TW.pixelText}`}>► THE CREW</h2>
                <div className="flex flex-wrap gap-8 justify-center py-4">
                  {Object.values(CHARACTERS).map((char) => (
                    <PixelCharacter
                      key={char.name}
                      name={char.name}
                      emoji={char.emoji}
                      tagline={char.tagline}
                      color={char.color}
                      bgColor={char.bg}
                    />
                  ))}
                </div>
              </PlayCard>
            </div>
          )}

          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="space-y-6">
              <PlayCard className="p-6" accent="pink">
                <h2 className={`text-lg text-pink-500 mb-4 ${TW.pixelText}`}>► BUTTONS</h2>
                <div className="flex flex-wrap gap-4 items-center justify-center">
                  <PixelButton variant="primary">PLAY</PixelButton>
                  <PixelButton variant="secondary">CONTINUE</PixelButton>
                  <PixelButton variant="happy">BONUS!</PixelButton>
                  <PixelButton variant="mint">NEW GAME</PixelButton>
                  <PixelButton variant="ghost">BACK</PixelButton>
                </div>
                <div className="flex flex-wrap gap-4 items-center justify-center mt-4">
                  <PixelButton variant="primary" size="sm">SM</PixelButton>
                  <PixelButton variant="primary" size="md">MEDIUM</PixelButton>
                  <PixelButton variant="primary" size="lg">LARGE</PixelButton>
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="cyan">
                <h2 className={`text-lg text-pink-500 mb-4 ${TW.pixelText}`}>► GAME SELECT</h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <GameCard title="Memory" icon="🧠" color="#ec4899" bgColor={COLORS.pastel.blush} />
                  <GameCard title="Snake" icon="🐍" color="#10b981" bgColor={COLORS.pastel.foam} />
                  <GameCard title="Dodge" icon="⚡" color="#f59e0b" bgColor={COLORS.pastel.cream} />
                  <GameCard title="Whack" icon="🔨" color="#06b6d4" bgColor={COLORS.pastel.sky} />
                  <GameCard title="React" icon="👆" color="#8b5cf6" bgColor={COLORS.pastel.lavender} />
                  <GameCard title="Soon" icon="✦" color="#94a3b8" bgColor={COLORS.pastel.cloud} />
                </div>
              </PlayCard>
            </div>
          )}

          {/* HUD Tab */}
          {activeTab === 'gameplay' && (
            <div className="space-y-6">
              <PlayCard className="p-6" accent="pink">
                <h2 className={`text-lg text-pink-500 mb-4 ${TW.pixelText}`}>► STATS</h2>
                <div className="flex flex-wrap gap-8 items-center justify-center">
                  <PixelScore score={12450} label="SCORE" color="pink" />
                  <PixelScore score={8} label="LEVEL" color="cyan" />
                  <PixelTimer seconds={127} />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="cyan">
                <h2 className={`text-lg text-pink-500 mb-4 ${TW.pixelText}`}>► HEALTH</h2>
                <div className="flex flex-wrap gap-8 items-center justify-center">
                  <PixelHealth current={8} max={10} color="pink" />
                  <PixelHealth current={4} max={10} color="cyan" />
                  <PixelHealth current={1} max={10} color="red" />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="yellow">
                <h2 className={`text-lg text-pink-500 mb-4 ${TW.pixelText}`}>► ITEMS</h2>
                <div className="flex flex-wrap gap-6 items-center justify-center py-4">
                  <PixelItem icon="⚡" label="SPEED" color={COLORS.pastel.cream} />
                  <PixelItem icon="🛡️" label="SHIELD" color={COLORS.pastel.sky} />
                  <PixelItem icon="💖" label="HP+" color={COLORS.pastel.blush} />
                  <PixelItem icon="⭐" label="STAR" color={COLORS.pastel.lavender} />
                  <PixelItem icon="🍎" label="SNACK" color="#fee2e2" />
                  <PixelItem icon="🍀" label="LUCKY" color={COLORS.pastel.foam} />
                </div>
              </PlayCard>
            </div>
          )}

          {/* Mockup Tab */}
          {activeTab === 'mockup' && (
            <div className="space-y-6">
              <div
                className="max-w-md mx-auto bg-white border-4 border-black overflow-hidden"
                style={{ boxShadow: SHADOWS['2xl'] }}
              >
                {/* Top bar */}
                <div
                  className="border-b-2 border-black px-3 py-2 flex justify-between items-center"
                  style={{ backgroundColor: COLORS.pastel.blush }}
                >
                  <div className={`text-[10px] text-pink-400 ${TW.pixelText}`}>LVL 08</div>
                  <PixelScore score={4280} label="" color="pink" />
                  <PixelTimer seconds={45} />
                </div>

                {/* Game Area */}
                <div className="aspect-square bg-slate-50 relative">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute -top-20 -left-20 w-6 h-6 bg-pink-300 border-2 border-black" />
                      <div className="absolute -top-12 left-16 w-4 h-4 bg-yellow-300 border border-black animate-pulse" />
                      <div className="absolute top-8 -left-24 w-4 h-4 bg-emerald-300 border border-black" />
                      <div className="absolute -top-4 left-24 w-5 h-5 bg-purple-300 border border-black" />

                      <div
                        className="w-10 h-10 border-2 border-black flex items-center justify-center"
                        style={{ backgroundColor: COLORS.primary.splash, boxShadow: SHADOWS.md }}
                      >
                        <span className={`text-black text-lg ${TW.pixelText}`}>▲</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom HUD */}
                <div
                  className="border-t-2 border-black px-3 py-2 flex justify-between items-center"
                  style={{ backgroundColor: COLORS.pastel.sky }}
                >
                  <PixelHealth current={7} max={10} color="pink" />
                  <div className="flex gap-2">
                    <PixelItem icon="⚡" label="" color={COLORS.pastel.cream} />
                    <PixelItem icon="🛡️" label="" color={COLORS.pastel.sky} />
                  </div>
                </div>
              </div>

              <div className={`text-center text-slate-400 text-xs ${TW.pixelText}`}>
                ↑ GAMEPLAY MOCKUP — BRIGHT & FRIENDLY
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <Marquee text="PLAY MORE • SMILE MORE • MADE WITH JOY" />
        <div className={`text-center mt-6 text-slate-400 text-xs ${TW.pixelText}`}>
          <span style={{ color: COLORS.primary.bubblegum }}>PIXEL</span>
          <span style={{ color: COLORS.primary.splash }}>PIT</span>
          <span className="ml-2">✦ small games. big smiles.</span>
        </div>
      </div>

      {/* Marquee animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PixelPitPlayroom;
