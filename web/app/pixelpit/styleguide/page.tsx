'use client';

/**
 * PIXELPIT STYLEGUIDE V3 — Neon Playroom
 *
 * Dark background + punchy colors + friendly shapes
 * The middle ground between Indie Bite and Playroom
 *
 * View at: http://localhost:3000/pixelpit/styleguide
 */

import React, { useState } from 'react';

// =============================================================================
// V3 COLOR SYSTEM — Neon Playroom
// =============================================================================

const COLORS = {
  // Background layers
  bg: {
    deep: '#0f172a',      // slate-900 — main background
    surface: '#1e293b',   // slate-800 — cards, panels
    elevated: '#334155',  // slate-700 — hover states
  },

  // Primary palette — SATURATED, not pastel
  primary: {
    pink: '#ec4899',      // Hot pink — THE lead
    cyan: '#22d3ee',      // Electric cyan — secondary
    yellow: '#fbbf24',    // Amber — energy, coins
    green: '#34d399',     // Emerald — success, health
    purple: '#a78bfa',    // Violet — special, magic
  },

  // Accent backgrounds — colored cards that pop
  accent: {
    pink: '#be185d',      // Pink-700 for cards
    cyan: '#0891b2',      // Cyan-600 for cards
    yellow: '#d97706',    // Amber-600 for cards
    green: '#059669',     // Emerald-600 for cards
    purple: '#7c3aed',    // Violet-600 for cards
  },

  // Text
  text: {
    primary: '#f8fafc',   // slate-50
    secondary: '#94a3b8', // slate-400
    muted: '#64748b',     // slate-500
  },
};

const SHADOWS = {
  sm: '2px 2px 0px 0px rgba(0,0,0,0.8)',
  md: '3px 3px 0px 0px rgba(0,0,0,0.8)',
  lg: '4px 4px 0px 0px rgba(0,0,0,0.8)',
  xl: '6px 6px 0px 0px rgba(0,0,0,0.8)',
  '2xl': '8px 8px 0px 0px rgba(0,0,0,0.8)',
  // Colored glows for special elements
  glow: {
    pink: '0 0 20px rgba(236,72,153,0.3)',
    cyan: '0 0 20px rgba(34,211,238,0.3)',
  },
};

const CHARACTERS = {
  dot: { name: 'DOT', emoji: '🎨', tagline: 'make it pretty', color: '#ec4899', bg: '#be185d' },
  pit: { name: 'PIT', emoji: '🎮', tagline: 'ship it', color: '#22d3ee', bg: '#0891b2' },
  bug: { name: 'BUG', emoji: '🔍', tagline: 'found one', color: '#34d399', bg: '#059669' },
  chip: { name: 'CHIP', emoji: '🎵', tagline: 'turn it up', color: '#fbbf24', bg: '#d97706' },
};

const TW = {
  pixelText: 'font-mono tracking-tight',
};

// =============================================================================
// TYPES
// =============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'warning' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function StyleguidePage() {
  const [activeTab, setActiveTab] = useState('overview');

  // ---------------------------------------------------------------------------
  // Tab Button
  // ---------------------------------------------------------------------------
  const TabButton = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-2 text-xs uppercase tracking-widest transition-all border-2 ${TW.pixelText} ${
        activeTab === id
          ? 'text-black border-black'
          : 'text-slate-400 border-slate-600 hover:border-pink-500 hover:text-pink-400'
      }`}
      style={
        activeTab === id
          ? { backgroundColor: COLORS.primary.pink, boxShadow: SHADOWS.lg }
          : { backgroundColor: COLORS.bg.surface }
      }
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
        className="w-14 h-14 border-2 border-black"
        style={{ backgroundColor: hex, boxShadow: SHADOWS.md }}
      />
      <span className={`text-xs text-slate-300 ${TW.pixelText}`}>{name}</span>
      <span className={`text-[10px] text-slate-500 ${TW.pixelText}`}>{hex}</span>
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

    const config: Record<ButtonVariant, { bg: string; text: string }> = {
      primary: { bg: COLORS.primary.pink, text: '#000000' },
      secondary: { bg: COLORS.primary.cyan, text: '#000000' },
      warning: { bg: COLORS.primary.yellow, text: '#000000' },
      success: { bg: COLORS.primary.green, text: '#000000' },
      ghost: { bg: 'transparent', text: COLORS.text.secondary },
    };

    const isGhost = variant === 'ghost';

    return (
      <button
        className={`${baseStyles} ${sizeStyles[size]} ${
          isGhost ? 'border-slate-600 hover:border-pink-500 hover:text-pink-400' : ''
        }`}
        style={
          !isGhost
            ? {
                backgroundColor: config[variant].bg,
                color: config[variant].text,
                boxShadow: SHADOWS.lg,
              }
            : { color: config[variant].text }
        }
      >
        {children}
      </button>
    );
  };

  // ---------------------------------------------------------------------------
  // Dark Card
  // ---------------------------------------------------------------------------
  const DarkCard = ({
    children,
    className = '',
    accent,
  }: {
    children: React.ReactNode;
    className?: string;
    accent?: 'pink' | 'cyan' | 'yellow';
  }) => {
    const borderColors = {
      pink: COLORS.primary.pink,
      cyan: COLORS.primary.cyan,
      yellow: COLORS.primary.yellow,
    };

    return (
      <div
        className={`border-2 ${className}`}
        style={{
          backgroundColor: COLORS.bg.surface,
          borderColor: accent ? borderColors[accent] : '#334155',
          boxShadow: SHADOWS.lg,
        }}
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
      pink: COLORS.primary.pink,
      cyan: COLORS.primary.cyan,
      yellow: COLORS.primary.yellow,
    };

    return (
      <div className="text-center">
        <div className={`text-[10px] text-slate-500 uppercase tracking-widest ${TW.pixelText}`}>
          {label}
        </div>
        <div
          className={`text-3xl ${TW.pixelText}`}
          style={{ color: colors[color], textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
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
    color?: 'pink' | 'cyan' | 'green';
  }) => {
    const segments = Array.from({ length: max }, (_, i) => i < current);
    const colors = {
      pink: COLORS.primary.pink,
      cyan: COLORS.primary.cyan,
      green: COLORS.primary.green,
    };

    return (
      <div>
        <div className={`text-[10px] text-slate-500 uppercase tracking-widest mb-1 ${TW.pixelText}`}>
          HP {current}/{max}
        </div>
        <div className="flex gap-1">
          {segments.map((filled, i) => (
            <div
              key={i}
              className="w-4 h-5 border border-black"
              style={{
                backgroundColor: filled ? colors[color] : COLORS.bg.deep,
                boxShadow: filled ? 'inset 0 -2px 0px rgba(0,0,0,0.3)' : 'none',
              }}
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
      className="flex items-center gap-1 border-2 border-black px-3 py-1"
      style={{ backgroundColor: COLORS.accent.yellow, boxShadow: SHADOWS.md }}
    >
      <span className="text-black">▶</span>
      <span className={`text-xl text-black ${TW.pixelText}`}>
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
          className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 whitespace-nowrap opacity-0 group-hover:opacity-100 ${TW.pixelText}`}
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
    bgColor,
  }: {
    title: string;
    icon: string;
    bgColor: string;
  }) => (
    <div
      className="relative cursor-pointer group overflow-hidden border-2 border-black transition-transform hover:-translate-y-1"
      style={{ backgroundColor: bgColor, boxShadow: SHADOWS.lg }}
    >
      <div className="p-4 text-center">
        <div className="text-3xl mb-2">{icon}</div>
        <div className={`text-xs uppercase tracking-wider font-bold text-white ${TW.pixelText}`}>
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
      <div className={`text-[10px] text-slate-500 ${TW.pixelText}`}>"{tagline}"</div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Marquee
  // ---------------------------------------------------------------------------
  const Marquee = ({ text }: { text: string }) => (
    <div
      className="overflow-hidden border-y-2 py-1"
      style={{ backgroundColor: COLORS.accent.pink, borderColor: COLORS.primary.pink }}
    >
      <div className={`animate-marquee whitespace-nowrap text-xs text-white font-bold ${TW.pixelText}`}>
        {text} ✦ {text} ✦ {text} ✦ {text} ✦
      </div>
    </div>
  );

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg.deep, color: COLORS.text.primary }}>
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(${COLORS.primary.pink} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.primary.pink} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className={`text-5xl font-bold mb-2 ${TW.pixelText}`}>
            <span style={{ color: COLORS.primary.pink }}>PIXEL</span>
            <span style={{ color: COLORS.primary.cyan }}>PIT</span>
          </h1>
          <p className={`text-slate-500 text-xs uppercase tracking-widest ${TW.pixelText}`}>
            neon playroom ✦ dark + punchy + friendly
          </p>
        </div>

        <Marquee text="SMALL GAMES • BIG ENERGY • PLAY MORE • SMILE MORE" />

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 my-6">
          <TabButton id="overview" label="Vibe" />
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
              <DarkCard className="p-6" accent="pink">
                <h2 className={`text-lg mb-4 flex items-center gap-2 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>
                  <span style={{ color: COLORS.primary.cyan }}>►</span> THE VIBE
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border-2 border-pink-500/30" style={{ backgroundColor: COLORS.bg.deep }}>
                    <div className={`text-sm mb-2 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>PUNCHY</div>
                    <p className={`text-xs text-slate-400 leading-relaxed ${TW.pixelText}`}>
                      Saturated colors on dark. Everything pops. No pastels, no whispers.
                    </p>
                  </div>
                  <div className="p-4 border-2 border-cyan-500/30" style={{ backgroundColor: COLORS.bg.deep }}>
                    <div className={`text-sm mb-2 ${TW.pixelText}`} style={{ color: COLORS.primary.cyan }}>FRIENDLY</div>
                    <p className={`text-xs text-slate-400 leading-relaxed ${TW.pixelText}`}>
                      Clean shapes, no CRT noise. Inviting, not intimidating. Games for everyone.
                    </p>
                  </div>
                  <div className="p-4 border-2 border-yellow-500/30" style={{ backgroundColor: COLORS.bg.deep }}>
                    <div className={`text-sm mb-2 ${TW.pixelText}`} style={{ color: COLORS.primary.yellow }}>ENERGETIC</div>
                    <p className={`text-xs text-slate-400 leading-relaxed ${TW.pixelText}`}>
                      "Big energy" means it. Bold moves, clear feedback, satisfying clicks.
                    </p>
                  </div>
                </div>
              </DarkCard>

              <DarkCard className="p-6" accent="cyan">
                <h2 className={`text-lg mb-4 flex items-center gap-2 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>
                  <span style={{ color: COLORS.primary.cyan }}>►</span> DESIGN RULES
                </h2>
                <div className={`space-y-3 text-sm ${TW.pixelText}`}>
                  <div className="flex items-start gap-3">
                    <span style={{ color: COLORS.primary.pink }}>01</span>
                    <span className="text-slate-300">
                      <span className="text-white">Dark backgrounds.</span> Slate-900 base. Colors pop against it.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span style={{ color: COLORS.primary.cyan }}>02</span>
                    <span className="text-slate-300">
                      <span className="text-white">Saturated accents.</span> Hot pink, electric cyan. No pastels.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span style={{ color: COLORS.primary.yellow }}>03</span>
                    <span className="text-slate-300">
                      <span className="text-white">Hard pixel shadows.</span> 4px offset, black. The signature.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span style={{ color: COLORS.primary.green }}>04</span>
                    <span className="text-slate-300">
                      <span className="text-white">No noise.</span> No scanlines, no glitch, no CRT. Clean pixels.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span style={{ color: COLORS.primary.purple }}>05</span>
                    <span className="text-slate-300">
                      <span className="text-white">Pink leads.</span> It's the brand. Cyan supports. Yellow energizes.
                    </span>
                  </div>
                </div>
              </DarkCard>

              <DarkCard className="p-6" accent="yellow">
                <h2 className={`text-lg mb-3 flex items-center gap-2 ${TW.pixelText}`} style={{ color: COLORS.primary.yellow }}>
                  <span>✦</span> THE DIFFERENCE
                </h2>
                <div className="grid md:grid-cols-3 gap-4 text-xs">
                  <div className="text-center p-3 border border-slate-700">
                    <div className="text-slate-500 mb-1">INDIE BITE</div>
                    <div className="text-slate-400">Dark + edgy + CRT</div>
                  </div>
                  <div className="text-center p-3 border-2" style={{ borderColor: COLORS.primary.pink }}>
                    <div style={{ color: COLORS.primary.pink }} className="mb-1">NEON PLAYROOM</div>
                    <div className="text-white">Dark + punchy + friendly</div>
                  </div>
                  <div className="text-center p-3 border border-slate-700">
                    <div className="text-slate-500 mb-1">PLAYROOM</div>
                    <div className="text-slate-400">Light + soft + cozy</div>
                  </div>
                </div>
              </DarkCard>
            </div>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <DarkCard className="p-6" accent="pink">
                <h2 className={`text-lg mb-4 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>► PRIMARY</h2>
                <div className="flex flex-wrap gap-6 justify-center">
                  <ColorSwatch name="HOT PINK" hex={COLORS.primary.pink} />
                  <ColorSwatch name="ELECTRIC" hex={COLORS.primary.cyan} />
                  <ColorSwatch name="AMBER" hex={COLORS.primary.yellow} />
                  <ColorSwatch name="EMERALD" hex={COLORS.primary.green} />
                  <ColorSwatch name="VIOLET" hex={COLORS.primary.purple} />
                </div>
              </DarkCard>

              <DarkCard className="p-6" accent="cyan">
                <h2 className={`text-lg mb-4 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>► BACKGROUNDS</h2>
                <div className="flex flex-wrap gap-6 justify-center">
                  <ColorSwatch name="DEEP" hex={COLORS.bg.deep} />
                  <ColorSwatch name="SURFACE" hex={COLORS.bg.surface} />
                  <ColorSwatch name="ELEVATED" hex={COLORS.bg.elevated} />
                </div>
              </DarkCard>

              <DarkCard className="p-6" accent="yellow">
                <h2 className={`text-lg mb-4 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>► THE CREW</h2>
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
              </DarkCard>
            </div>
          )}

          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="space-y-6">
              <DarkCard className="p-6" accent="pink">
                <h2 className={`text-lg mb-4 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>► BUTTONS</h2>
                <div className="flex flex-wrap gap-4 items-center justify-center">
                  <PixelButton variant="primary">PLAY</PixelButton>
                  <PixelButton variant="secondary">CONTINUE</PixelButton>
                  <PixelButton variant="warning">BONUS!</PixelButton>
                  <PixelButton variant="success">NEW GAME</PixelButton>
                  <PixelButton variant="ghost">BACK</PixelButton>
                </div>
                <div className="flex flex-wrap gap-4 items-center justify-center mt-4">
                  <PixelButton variant="primary" size="sm">SM</PixelButton>
                  <PixelButton variant="primary" size="md">MEDIUM</PixelButton>
                  <PixelButton variant="primary" size="lg">LARGE</PixelButton>
                </div>
              </DarkCard>

              <DarkCard className="p-6" accent="cyan">
                <h2 className={`text-lg mb-4 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>► GAME SELECT</h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <GameCard title="Memory" icon="🧠" bgColor={COLORS.accent.pink} />
                  <GameCard title="Snake" icon="🐍" bgColor={COLORS.accent.green} />
                  <GameCard title="Dodge" icon="⚡" bgColor={COLORS.accent.yellow} />
                  <GameCard title="Whack" icon="🔨" bgColor={COLORS.accent.cyan} />
                  <GameCard title="React" icon="👆" bgColor={COLORS.accent.purple} />
                  <GameCard title="Soon" icon="✦" bgColor={COLORS.bg.elevated} />
                </div>
              </DarkCard>

              <DarkCard className="p-6" accent="yellow">
                <h2 className={`text-lg mb-4 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>► DIALOG BOX</h2>
                <div
                  className="max-w-sm mx-auto border-4 border-black p-4"
                  style={{ backgroundColor: COLORS.bg.surface, boxShadow: SHADOWS.xl }}
                >
                  <div className="border-b-2 border-slate-700 pb-2 mb-3 flex items-center justify-between">
                    <span className={`text-xs text-slate-500 ${TW.pixelText}`}>NICE!</span>
                    <span className="text-pink-400 cursor-pointer hover:text-pink-300">✕</span>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className={`text-xl mb-2 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>LEVEL CLEAR!</h3>
                    <p className={`text-sm text-slate-400 mb-4 ${TW.pixelText}`}>SCORE: 012450</p>
                    <div className="flex gap-3 justify-center">
                      <PixelButton variant="ghost" size="sm">MENU</PixelButton>
                      <PixelButton variant="primary" size="sm">NEXT</PixelButton>
                    </div>
                  </div>
                </div>
              </DarkCard>
            </div>
          )}

          {/* HUD Tab */}
          {activeTab === 'gameplay' && (
            <div className="space-y-6">
              <DarkCard className="p-6" accent="pink">
                <h2 className={`text-lg mb-4 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>► STATS</h2>
                <div className="flex flex-wrap gap-8 items-center justify-center">
                  <PixelScore score={12450} label="SCORE" color="pink" />
                  <PixelScore score={8} label="LEVEL" color="cyan" />
                  <PixelTimer seconds={127} />
                </div>
              </DarkCard>

              <DarkCard className="p-6" accent="cyan">
                <h2 className={`text-lg mb-4 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>► HEALTH</h2>
                <div className="flex flex-wrap gap-8 items-center justify-center">
                  <PixelHealth current={8} max={10} color="pink" />
                  <PixelHealth current={4} max={10} color="cyan" />
                  <PixelHealth current={1} max={10} color="green" />
                </div>
              </DarkCard>

              <DarkCard className="p-6" accent="yellow">
                <h2 className={`text-lg mb-4 ${TW.pixelText}`} style={{ color: COLORS.primary.pink }}>► ITEMS</h2>
                <div className="flex flex-wrap gap-6 items-center justify-center py-4">
                  <PixelItem icon="⚡" label="SPEED" color={COLORS.accent.yellow} />
                  <PixelItem icon="🛡️" label="SHIELD" color={COLORS.accent.cyan} />
                  <PixelItem icon="💖" label="HP+" color={COLORS.accent.pink} />
                  <PixelItem icon="⭐" label="STAR" color={COLORS.accent.purple} />
                  <PixelItem icon="🍎" label="SNACK" color="#dc2626" />
                  <PixelItem icon="🍀" label="LUCKY" color={COLORS.accent.green} />
                </div>
              </DarkCard>
            </div>
          )}

          {/* Mockup Tab */}
          {activeTab === 'mockup' && (
            <div className="space-y-6">
              <div
                className="max-w-md mx-auto border-4 border-black overflow-hidden"
                style={{ backgroundColor: COLORS.bg.surface, boxShadow: SHADOWS['2xl'] }}
              >
                {/* Top bar */}
                <div
                  className="border-b-2 border-black px-3 py-2 flex justify-between items-center"
                  style={{ backgroundColor: COLORS.accent.pink }}
                >
                  <div className={`text-[10px] text-pink-200 ${TW.pixelText}`}>LVL 08</div>
                  <PixelScore score={4280} label="" color="pink" />
                  <PixelTimer seconds={45} />
                </div>

                {/* Game Area */}
                <div className="aspect-square relative" style={{ backgroundColor: COLORS.bg.deep }}>
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `linear-gradient(${COLORS.text.muted} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.text.muted} 1px, transparent 1px)`,
                      backgroundSize: '16px 16px',
                    }}
                  />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute -top-20 -left-20 w-6 h-6 border-2 border-black" style={{ backgroundColor: COLORS.primary.pink }} />
                      <div className="absolute -top-12 left-16 w-4 h-4 border border-black animate-pulse" style={{ backgroundColor: COLORS.primary.yellow }} />
                      <div className="absolute top-8 -left-24 w-4 h-4 border border-black" style={{ backgroundColor: COLORS.primary.green }} />
                      <div className="absolute -top-4 left-24 w-5 h-5 border border-black" style={{ backgroundColor: COLORS.primary.purple }} />

                      <div
                        className="w-12 h-12 border-2 border-black flex items-center justify-center"
                        style={{ backgroundColor: COLORS.primary.cyan, boxShadow: SHADOWS.md }}
                      >
                        <span className={`text-black text-xl ${TW.pixelText}`}>▲</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom HUD */}
                <div
                  className="border-t-2 border-black px-3 py-2 flex justify-between items-center"
                  style={{ backgroundColor: COLORS.accent.cyan }}
                >
                  <PixelHealth current={7} max={10} color="pink" />
                  <div className="flex gap-2">
                    <PixelItem icon="⚡" label="" color={COLORS.accent.yellow} />
                    <PixelItem icon="🛡️" label="" color={COLORS.accent.cyan} />
                  </div>
                </div>
              </div>

              <div className={`text-center text-slate-500 text-xs ${TW.pixelText}`}>
                ↑ GAMEPLAY MOCKUP — DARK + PUNCHY + FRIENDLY
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <Marquee text="SMALL GAMES • BIG ENERGY • MADE WITH LOVE" />
        <div className={`text-center mt-6 text-slate-500 text-xs ${TW.pixelText}`}>
          <span style={{ color: COLORS.primary.pink }}>PIXEL</span>
          <span style={{ color: COLORS.primary.cyan }}>PIT</span>
          <span className="ml-2">✦ small games. big energy.</span>
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
}
