import React, { useState, useEffect } from 'react';

const PixelPitIndieBite = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [glitch, setGlitch] = useState(false);

  // Occasional glitch effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 100);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Pixel font style (simulated with CSS)
  const pixelText = "font-mono tracking-tight";

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-2 text-xs uppercase tracking-widest transition-all border-2 ${pixelText} ${
        activeTab === id 
          ? 'bg-lime-400 text-black border-lime-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
          : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
      }`}
      style={{ imageRendering: 'pixelated' }}
    >
      {label}
    </button>
  );

  const ColorSwatch = ({ color, name, hex }) => (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="w-12 h-12 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        style={{ backgroundColor: hex }}
      />
      <span className={`text-xs text-zinc-300 ${pixelText}`}>{name}</span>
      <span className={`text-xs text-zinc-600 ${pixelText}`}>{hex}</span>
    </div>
  );

  // Chunky pixel button
  const PixelButton = ({ variant = 'primary', size = 'md', children }) => {
    const baseStyles = `${pixelText} uppercase tracking-wider border-2 border-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none`;
    const sizeStyles = {
      sm: 'px-3 py-1 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    const variantStyles = {
      primary: 'bg-lime-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-lime-300',
      danger: 'bg-red-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-400',
      secondary: 'bg-fuchsia-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-fuchsia-400',
      ghost: 'bg-transparent text-zinc-400 border-zinc-600 shadow-none hover:bg-zinc-800 hover:text-white',
      crt: 'bg-cyan-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-cyan-300',
    };
    
    return (
      <button className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`}>
        {children}
      </button>
    );
  };

  // Dithered card background
  const DitherCard = ({ children, className = '', variant = 'default' }) => {
    const patterns = {
      default: `repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(255,255,255,0.03) 2px,
        rgba(255,255,255,0.03) 4px
      )`,
      danger: `repeating-linear-gradient(
        45deg,
        transparent,
        transparent 4px,
        rgba(239,68,68,0.1) 4px,
        rgba(239,68,68,0.1) 8px
      )`,
    };
    
    return (
      <div 
        className={`bg-zinc-900 border-2 border-zinc-700 ${className}`}
        style={{ backgroundImage: patterns[variant] }}
      >
        {children}
      </div>
    );
  };

  // Chunky score display
  const PixelScore = ({ score, label }) => (
    <div className="text-center">
      <div className={`text-[10px] text-zinc-500 uppercase tracking-widest ${pixelText}`}>{label}</div>
      <div 
        className={`text-3xl text-lime-400 ${pixelText}`}
        style={{ 
          textShadow: '2px 2px 0px rgba(0,0,0,1), -1px -1px 0px rgba(163,230,53,0.3)',
        }}
      >
        {String(score).padStart(6, '0')}
      </div>
    </div>
  );

  // Segmented health bar
  const PixelHealth = ({ current, max }) => {
    const segments = Array.from({ length: max }, (_, i) => i < current);
    return (
      <div>
        <div className={`text-[10px] text-zinc-500 uppercase tracking-widest mb-1 ${pixelText}`}>
          HP {current}/{max}
        </div>
        <div className="flex gap-1">
          {segments.map((filled, i) => (
            <div 
              key={i}
              className={`w-4 h-5 border border-black ${
                filled 
                  ? 'bg-red-500 shadow-[inset_0_-2px_0px_rgba(0,0,0,0.3)]' 
                  : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  // Blinking timer
  const PixelTimer = ({ seconds }) => {
    const [blink, setBlink] = useState(true);
    useEffect(() => {
      const interval = setInterval(() => setBlink(b => !b), 500);
      return () => clearInterval(interval);
    }, []);
    
    return (
      <div className="flex items-center gap-1 bg-black border-2 border-zinc-700 px-3 py-1">
        <span className={`text-yellow-400 ${blink ? 'opacity-100' : 'opacity-30'}`}>▶</span>
        <span className={`text-xl text-yellow-400 ${pixelText}`}>
          {Math.floor(seconds / 60)}{blink ? ':' : ' '}{(seconds % 60).toString().padStart(2, '0')}
        </span>
      </div>
    );
  };

  // Pixel item box
  const PixelItem = ({ icon, label, color }) => (
    <div className="relative group cursor-pointer">
      <div 
        className="w-12 h-12 border-2 border-black flex items-center justify-center text-xl transition-transform group-hover:-translate-y-1"
        style={{ 
          backgroundColor: color,
          boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)',
        }}
      >
        <span style={{ imageRendering: 'pixelated' }}>{icon}</span>
      </div>
      <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 whitespace-nowrap opacity-0 group-hover:opacity-100 ${pixelText}`}>
        {label}
      </div>
    </div>
  );

  // Game card with scanlines
  const GameCard = ({ title, icon, color }) => (
    <div 
      className="relative cursor-pointer group overflow-hidden border-2 border-black"
      style={{ 
        backgroundColor: color,
        boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
      }}
    >
      {/* Scanlines overlay - subtle */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 4px)',
        }}
      />
      <div className="p-4 text-center relative z-10 transition-transform group-hover:-translate-y-0.5">
        <div className="text-3xl mb-2" style={{ imageRendering: 'pixelated' }}>{icon}</div>
        <div className={`text-xs uppercase tracking-wider text-black font-bold ${pixelText}`}>{title}</div>
      </div>
    </div>
  );

  // Character with pixel border
  const PixelCharacter = ({ name, emoji, tagline, color }) => (
    <div className="text-center group">
      <div 
        className="w-16 h-16 mx-auto mb-2 border-2 border-black flex items-center justify-center text-3xl transition-all group-hover:scale-105"
        style={{ 
          backgroundColor: color,
          boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)',
          imageRendering: 'pixelated',
        }}
      >
        {emoji}
      </div>
      <div className={`text-sm text-white font-bold ${pixelText}`}>{name}</div>
      <div className={`text-[10px] text-zinc-500 ${pixelText}`}>"{tagline}"</div>
    </div>
  );

  // Glitchy text
  const GlitchText = ({ children, className = '' }) => (
    <span 
      className={`relative inline-block ${className}`}
      style={glitch ? {
        textShadow: '-2px 0 #ff0040, 2px 0 #00ffff',
        animation: 'none',
      } : {}}
    >
      {children}
    </span>
  );

  // Marquee-style scrolling text
  const Marquee = ({ text }) => (
    <div className="overflow-hidden bg-black border-y border-zinc-800 py-1">
      <div className={`animate-marquee whitespace-nowrap text-xs text-lime-400 ${pixelText}`}>
        {text} ★ {text} ★ {text} ★ {text} ★
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* CRT overlay effect - very subtle */}
      <div 
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
        }}
      />
      
      {/* Vignette - subtle */}
      <div 
        className="fixed inset-0 pointer-events-none z-40"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 70%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <GlitchText>
            <h1 className={`text-4xl font-bold mb-1 ${pixelText}`}>
              <span className="text-fuchsia-500">PIXEL</span>
              <span className="text-cyan-400">PIT</span>
            </h1>
          </GlitchText>
          <p className={`text-zinc-600 text-xs uppercase tracking-widest ${pixelText}`}>
            indie bite edition ★ raw & unfiltered
          </p>
        </div>

        <Marquee text="SMALL GAMES • BIG ENERGY • MADE WITH LOVE AND CAFFEINE" />

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 my-6">
          <TabButton id="overview" label="Manifesto" />
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
              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 flex items-center gap-2 ${pixelText}`}>
                  <span className="text-fuchsia-500">►</span> THE VIBE
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-black/50 p-4 border border-zinc-800">
                    <div className={`text-fuchsia-500 text-sm mb-2 ${pixelText}`}>CRUNCHY</div>
                    <p className={`text-xs text-zinc-400 leading-relaxed ${pixelText}`}>
                      Hard pixels. No anti-aliasing. Every edge is intentional. If it's blurry, it's broken.
                    </p>
                  </div>
                  <div className="bg-black/50 p-4 border border-zinc-800">
                    <div className={`text-cyan-400 text-sm mb-2 ${pixelText}`}>LOUD</div>
                    <p className={`text-xs text-zinc-400 leading-relaxed ${pixelText}`}>
                      Bold colors that punch. Neon accents that demand attention. We're not subtle.
                    </p>
                  </div>
                  <div className="bg-black/50 p-4 border border-zinc-800">
                    <div className={`text-lime-400 text-sm mb-2 ${pixelText}`}>ALIVE</div>
                    <p className={`text-xs text-zinc-400 leading-relaxed ${pixelText}`}>
                      Blinking cursors. Glitch artifacts. Scanlines. The screen is breathing.
                    </p>
                  </div>
                </div>
              </DitherCard>

              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 flex items-center gap-2 ${pixelText}`}>
                  <span className="text-fuchsia-500">►</span> DESIGN RULES
                </h2>
                <div className={`space-y-3 text-sm ${pixelText}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 mt-0.5">01</span>
                    <span className="text-zinc-300"><span className="text-white">No rounded corners.</span> Pixels are square. Deal with it.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-500 mt-0.5">02</span>
                    <span className="text-zinc-300"><span className="text-white">Hard drop shadows.</span> 4px offset. Always black. No blur.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lime-500 mt-0.5">03</span>
                    <span className="text-zinc-300"><span className="text-white">Limited palette.</span> Pick 5 colors max per screen. Constraints breed creativity.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-500 mt-0.5">04</span>
                    <span className="text-zinc-300"><span className="text-white">Mono fonts only.</span> Every character same width. Like a terminal.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-fuchsia-500 mt-0.5">05</span>
                    <span className="text-zinc-300"><span className="text-white">Add texture.</span> Scanlines, dithering, noise. Flat is dead.</span>
                  </div>
                </div>
              </DitherCard>

              <DitherCard className="p-6" variant="danger">
                <h2 className={`text-lg text-red-500 mb-3 flex items-center gap-2 ${pixelText}`}>
                  <span>⚠</span> ANTI-PATTERNS
                </h2>
                <p className={`text-xs text-zinc-400 ${pixelText}`}>
                  No gradients. No blur. No smooth shadows. No system fonts. No safe choices. 
                  If it looks "professional" it's probably wrong.
                </p>
              </DitherCard>
            </div>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► PRIMARY</h2>
                <div className="flex flex-wrap gap-6 justify-center">
                  <ColorSwatch name="SLIME" hex="#a3e635" />
                  <ColorSwatch name="LASER" hex="#22d3ee" />
                  <ColorSwatch name="PUNK" hex="#d946ef" />
                  <ColorSwatch name="BLOOD" hex="#ef4444" />
                  <ColorSwatch name="GOLD" hex="#facc15" />
                </div>
              </DitherCard>

              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► DARKS</h2>
                <div className="flex flex-wrap gap-6 justify-center">
                  <ColorSwatch name="VOID" hex="#09090b" />
                  <ColorSwatch name="COAL" hex="#18181b" />
                  <ColorSwatch name="ASH" hex="#27272a" />
                  <ColorSwatch name="STEEL" hex="#3f3f46" />
                </div>
              </DitherCard>

              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► THE CREW</h2>
                <div className="flex flex-wrap gap-8 justify-center py-4">
                  <PixelCharacter name="DOT" emoji="🎨" tagline="make it pretty" color="#f472b6" />
                  <PixelCharacter name="PIT" emoji="🎮" tagline="ship it" color="#22d3ee" />
                  <PixelCharacter name="BUG" emoji="🔍" tagline="found one" color="#a3e635" />
                  <PixelCharacter name="CHIP" emoji="🎵" tagline="turn it up" color="#facc15" />
                </div>
              </DitherCard>
            </div>
          )}

          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="space-y-6">
              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► BUTTONS</h2>
                <div className="flex flex-wrap gap-4 items-center justify-center">
                  <PixelButton variant="primary">START</PixelButton>
                  <PixelButton variant="secondary">OPTIONS</PixelButton>
                  <PixelButton variant="crt">CONTINUE</PixelButton>
                  <PixelButton variant="danger">QUIT</PixelButton>
                  <PixelButton variant="ghost">BACK</PixelButton>
                </div>
                <div className="flex flex-wrap gap-4 items-center justify-center mt-4">
                  <PixelButton variant="primary" size="sm">SM</PixelButton>
                  <PixelButton variant="primary" size="md">MEDIUM</PixelButton>
                  <PixelButton variant="primary" size="lg">LARGE</PixelButton>
                </div>
              </DitherCard>

              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► GAME SELECT</h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <GameCard title="Memory" icon="🧠" color="#f472b6" />
                  <GameCard title="Snake" icon="🐍" color="#a3e635" />
                  <GameCard title="Dodge" icon="⚡" color="#facc15" />
                  <GameCard title="Whack" icon="🔨" color="#22d3ee" />
                  <GameCard title="React" icon="👆" color="#d946ef" />
                  <GameCard title="????" icon="✦" color="#3f3f46" />
                </div>
              </DitherCard>

              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► DIALOG BOX</h2>
                <div className="max-w-sm mx-auto bg-zinc-900 border-4 border-white p-4">
                  <div className="border-b-2 border-zinc-700 pb-2 mb-3 flex items-center justify-between">
                    <span className={`text-xs text-zinc-500 ${pixelText}`}>SYSTEM.MSG</span>
                    <span className="text-red-500 cursor-pointer hover:text-red-400">✕</span>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-3">💀</div>
                    <h3 className={`text-xl text-white mb-2 ${pixelText}`}>GAME OVER</h3>
                    <p className={`text-sm text-zinc-400 mb-4 ${pixelText}`}>SCORE: 012450</p>
                    <div className="flex gap-3 justify-center">
                      <PixelButton variant="ghost" size="sm">MENU</PixelButton>
                      <PixelButton variant="primary" size="sm">RETRY</PixelButton>
                    </div>
                  </div>
                </div>
              </DitherCard>
            </div>
          )}

          {/* Gameplay UI Tab */}
          {activeTab === 'gameplay' && (
            <div className="space-y-6">
              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► STATS</h2>
                <div className="flex flex-wrap gap-8 items-center justify-center">
                  <PixelScore score={12450} label="SCORE" />
                  <PixelScore score={8} label="LEVEL" />
                  <PixelTimer seconds={127} />
                </div>
              </DitherCard>

              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► HEALTH</h2>
                <div className="flex flex-wrap gap-8 items-center justify-center">
                  <PixelHealth current={8} max={10} />
                  <PixelHealth current={4} max={10} />
                  <PixelHealth current={1} max={10} />
                </div>
              </DitherCard>

              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► ITEMS</h2>
                <div className="flex flex-wrap gap-6 items-center justify-center py-4">
                  <PixelItem icon="⚡" label="SPEED" color="#facc15" />
                  <PixelItem icon="🛡️" label="SHIELD" color="#22d3ee" />
                  <PixelItem icon="💖" label="HP+" color="#f472b6" />
                  <PixelItem icon="⭐" label="STAR" color="#d946ef" />
                  <PixelItem icon="🔥" label="FIRE" color="#ef4444" />
                  <PixelItem icon="❄️" label="ICE" color="#67e8f9" />
                </div>
              </DitherCard>

              <DitherCard className="p-6">
                <h2 className={`text-lg text-lime-400 mb-4 ${pixelText}`}>► ACHIEVEMENT</h2>
                <div className="max-w-md mx-auto bg-black border-2 border-yellow-500 p-3 flex items-center gap-3">
                  <div 
                    className="w-10 h-10 bg-yellow-500 border-2 border-black flex items-center justify-center text-xl"
                    style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }}
                  >
                    🏆
                  </div>
                  <div>
                    <div className={`text-yellow-500 text-sm ${pixelText}`}>UNLOCKED!</div>
                    <div className={`text-xs text-zinc-400 ${pixelText}`}>SPEED DEMON — clear in &lt;30s</div>
                  </div>
                </div>
              </DitherCard>
            </div>
          )}

          {/* Game Mockup Tab */}
          {activeTab === 'mockup' && (
            <div className="space-y-6">
              <div 
                className="max-w-md mx-auto bg-zinc-900 border-4 border-zinc-700 overflow-hidden"
                style={{
                  boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
                }}
              >
                {/* Scanline overlay - very subtle */}
                <div 
                  className="absolute inset-0 pointer-events-none z-20"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)',
                  }}
                />

                {/* Top bar */}
                <div className="bg-black border-b-2 border-zinc-700 px-3 py-2 flex justify-between items-center">
                  <div className={`text-[10px] text-zinc-500 ${pixelText}`}>LVL 08</div>
                  <PixelScore score={4280} label="" />
                  <PixelTimer seconds={45} />
                </div>

                {/* Game Area */}
                <div className="aspect-square bg-zinc-950 relative">
                  {/* Grid */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                  
                  {/* Game elements */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Enemies/collectibles */}
                      <div className="absolute -top-20 -left-20 w-6 h-6 bg-red-500 border border-black" />
                      <div className="absolute -top-12 left-16 w-4 h-4 bg-yellow-400 border border-black animate-pulse" />
                      <div className="absolute top-8 -left-24 w-4 h-4 bg-lime-400 border border-black" />
                      <div className="absolute -top-4 left-24 w-5 h-5 bg-fuchsia-500 border border-black" />
                      
                      {/* Player */}
                      <div 
                        className="w-10 h-10 bg-cyan-400 border-2 border-black flex items-center justify-center"
                        style={{ 
                          boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)',
                        }}
                      >
                        <span className={`text-black text-lg ${pixelText}`}>▲</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom HUD */}
                <div className="bg-black border-t-2 border-zinc-700 px-3 py-2 flex justify-between items-center">
                  <PixelHealth current={7} max={10} />
                  <div className="flex gap-2">
                    <PixelItem icon="⚡" label="" color="#facc15" />
                    <PixelItem icon="🛡️" label="" color="#22d3ee" />
                  </div>
                </div>
              </div>

              <div className={`text-center text-zinc-600 text-xs ${pixelText}`}>
                ↑ GAMEPLAY MOCKUP — RAW PIXEL ENERGY
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <Marquee text="BUILT DIFFERENT • NO COMPROMISE • INDIE FOREVER" />
        <div className={`text-center mt-6 text-zinc-700 text-xs ${pixelText}`}>
          <span className="text-fuchsia-500">PIXEL</span>
          <span className="text-cyan-400">PIT</span>
          <span className="ml-2">★ small games. big energy.</span>
        </div>
      </div>

      {/* Add marquee animation */}
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

export default PixelPitIndieBite;
