import React, { useState } from 'react';

const PixelPitPlayroom = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [glitchHover, setGlitchHover] = useState(false);

  // Pixel font style
  const pixelText = "font-mono tracking-tight";

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-2 text-xs uppercase tracking-widest transition-all border-2 ${pixelText} ${
        activeTab === id 
          ? 'bg-pink-400 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
          : 'bg-white text-slate-400 border-slate-300 hover:border-pink-300 hover:text-pink-500'
      }`}
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
      <span className={`text-xs text-slate-700 ${pixelText}`}>{name}</span>
      <span className={`text-xs text-slate-400 ${pixelText}`}>{hex}</span>
    </div>
  );

  // Chunky pixel button - playroom style
  const PixelButton = ({ variant = 'primary', size = 'md', children }) => {
    const baseStyles = `${pixelText} uppercase tracking-wider border-2 border-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none`;
    const sizeStyles = {
      sm: 'px-3 py-1 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    const variantStyles = {
      primary: 'bg-pink-400 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-500',
      secondary: 'bg-cyan-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-cyan-300',
      happy: 'bg-yellow-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400',
      mint: 'bg-emerald-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300',
      ghost: 'bg-white text-slate-500 border-slate-300 shadow-none hover:bg-slate-50 hover:text-pink-500 hover:border-pink-300',
    };
    
    return (
      <button className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`}>
        {children}
      </button>
    );
  };

  // Light card with subtle pattern
  const PlayCard = ({ children, className = '', accent = 'pink' }) => {
    const accents = {
      pink: 'border-pink-200',
      cyan: 'border-cyan-200',
      yellow: 'border-yellow-200',
    };
    
    return (
      <div 
        className={`bg-white border-2 ${accents[accent]} shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ${className}`}
      >
        {children}
      </div>
    );
  };

  // Score display - friendly colors
  const PixelScore = ({ score, label, color = 'pink' }) => {
    const colors = {
      pink: 'text-pink-500',
      cyan: 'text-cyan-500',
      yellow: 'text-yellow-500',
    };
    return (
      <div className="text-center">
        <div className={`text-[10px] text-slate-400 uppercase tracking-widest ${pixelText}`}>{label}</div>
        <div 
          className={`text-3xl ${colors[color]} ${pixelText}`}
          style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}
        >
          {String(score).padStart(6, '0')}
        </div>
      </div>
    );
  };

  // Segmented health bar - softer colors
  const PixelHealth = ({ current, max, color = 'pink' }) => {
    const segments = Array.from({ length: max }, (_, i) => i < current);
    const colors = {
      pink: 'bg-pink-400',
      red: 'bg-red-400',
      cyan: 'bg-cyan-400',
    };
    return (
      <div>
        <div className={`text-[10px] text-slate-400 uppercase tracking-widest mb-1 ${pixelText}`}>
          HP {current}/{max}
        </div>
        <div className="flex gap-1">
          {segments.map((filled, i) => (
            <div 
              key={i}
              className={`w-4 h-5 border border-black ${
                filled 
                  ? `${colors[color]} shadow-[inset_0_-2px_0px_rgba(0,0,0,0.15)]` 
                  : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  // Timer - friendly style
  const PixelTimer = ({ seconds }) => {
    return (
      <div className="flex items-center gap-1 bg-yellow-100 border-2 border-black px-3 py-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <span className="text-yellow-600">▶</span>
        <span className={`text-xl text-yellow-600 ${pixelText}`}>
          {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
        </span>
      </div>
    );
  };

  // Pixel item box - pastel backgrounds
  const PixelItem = ({ icon, label, color }) => (
    <div className="relative group cursor-pointer">
      <div 
        className="w-12 h-12 border-2 border-black flex items-center justify-center text-xl transition-transform group-hover:-translate-y-1"
        style={{ 
          backgroundColor: color,
          boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)',
        }}
      >
        <span>{icon}</span>
      </div>
      <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap opacity-0 group-hover:opacity-100 ${pixelText}`}>
        {label}
      </div>
    </div>
  );

  // Game card - pastel with black borders
  const GameCard = ({ title, icon, color, bgColor }) => (
    <div 
      className="relative cursor-pointer group overflow-hidden border-2 border-black transition-transform hover:-translate-y-1"
      style={{ 
        backgroundColor: bgColor,
        boxShadow: '4px_4px_0px_0px_rgba(0,0,0,1)',
      }}
    >
      <div className="p-4 text-center">
        <div className="text-3xl mb-2">{icon}</div>
        <div className={`text-xs uppercase tracking-wider font-bold ${pixelText}`} style={{ color }}>{title}</div>
      </div>
    </div>
  );

  // Character card - the crew
  const PixelCharacter = ({ name, emoji, tagline, color, bgColor }) => (
    <div className="text-center group">
      <div 
        className="w-16 h-16 mx-auto mb-2 border-2 border-black flex items-center justify-center text-3xl transition-all group-hover:-translate-y-1"
        style={{ 
          backgroundColor: bgColor,
          boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)',
        }}
      >
        {emoji}
      </div>
      <div className={`text-sm font-bold ${pixelText}`} style={{ color }}>{name}</div>
      <div className={`text-[10px] text-slate-400 ${pixelText}`}>"{tagline}"</div>
    </div>
  );

  // Glitch text - only on hover
  const GlitchText = ({ children, className = '' }) => (
    <span 
      className={`relative inline-block cursor-pointer ${className}`}
      onMouseEnter={() => setGlitchHover(true)}
      onMouseLeave={() => setGlitchHover(false)}
      style={glitchHover ? {
        textShadow: '-2px 0 #00d4aa, 2px 0 #ff6b9d',
      } : {}}
    >
      {children}
    </span>
  );

  // Marquee
  const Marquee = ({ text }) => (
    <div className="overflow-hidden bg-pink-100 border-y-2 border-pink-200 py-1">
      <div className={`animate-marquee whitespace-nowrap text-xs text-pink-500 ${pixelText}`}>
        {text} ✦ {text} ✦ {text} ✦ {text} ✦
      </div>
    </div>
  );

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
            <h1 className={`text-4xl font-bold mb-1 ${pixelText}`}>
              <span className="text-pink-500">PIXEL</span>
              <span className="text-cyan-500">PIT</span>
            </h1>
          </GlitchText>
          <p className={`text-slate-400 text-xs uppercase tracking-widest ${pixelText}`}>
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
                <h2 className={`text-lg text-pink-500 mb-4 flex items-center gap-2 ${pixelText}`}>
                  <span className="text-cyan-500">►</span> THE VIBE
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-pink-50 p-4 border border-pink-100">
                    <div className={`text-pink-500 text-sm mb-2 ${pixelText}`}>CRUNCHY</div>
                    <p className={`text-xs text-slate-500 leading-relaxed ${pixelText}`}>
                      Hard pixels, sharp edges. Every element is crisp and intentional. No blur, no fuzz.
                    </p>
                  </div>
                  <div className="bg-cyan-50 p-4 border border-cyan-100">
                    <div className={`text-cyan-500 text-sm mb-2 ${pixelText}`}>FRIENDLY</div>
                    <p className={`text-xs text-slate-500 leading-relaxed ${pixelText}`}>
                      Bright colors, light backgrounds. Games should feel welcoming and fun.
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 border border-yellow-100">
                    <div className={`text-yellow-600 text-sm mb-2 ${pixelText}`}>PLAYFUL</div>
                    <p className={`text-xs text-slate-500 leading-relaxed ${pixelText}`}>
                      Subtle animations, cheerful palette. The UI should make you smile.
                    </p>
                  </div>
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="cyan">
                <h2 className={`text-lg text-pink-500 mb-4 flex items-center gap-2 ${pixelText}`}>
                  <span className="text-cyan-500">►</span> DESIGN RULES
                </h2>
                <div className={`space-y-3 text-sm ${pixelText}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-pink-500 mt-0.5">01</span>
                    <span className="text-slate-600"><span className="text-slate-800">No rounded corners.</span> Pixels are square. That's the charm.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-500 mt-0.5">02</span>
                    <span className="text-slate-600"><span className="text-slate-800">Hard drop shadows.</span> 4px offset, always black. Clean and punchy.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-500 mt-0.5">03</span>
                    <span className="text-slate-600"><span className="text-slate-800">Pink leads.</span> It's our signature. Cyan supports. Everything else accents.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5">04</span>
                    <span className="text-slate-600"><span className="text-slate-800">Mono fonts only.</span> Every character same width. Retro but readable.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-purple-500 mt-0.5">05</span>
                    <span className="text-slate-600"><span className="text-slate-800">Light & bright.</span> White backgrounds, pastel accents. Easy on the eyes.</span>
                  </div>
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="yellow">
                <h2 className={`text-lg text-cyan-500 mb-3 flex items-center gap-2 ${pixelText}`}>
                  <span>💡</span> WHEN TO USE
                </h2>
                <p className={`text-xs text-slate-500 ${pixelText}`}>
                  Puzzle games. Kids games. Cozy vibes. Daytime arcade. Anything that should feel 
                  welcoming, approachable, and fun. For darker, edgier games, use the <span className="text-pink-500">Arcade</span> theme.
                </p>
              </PlayCard>
            </div>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <PlayCard className="p-6" accent="pink">
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► PRIMARY</h2>
                <div className="flex flex-wrap gap-6 justify-center">
                  <ColorSwatch name="BUBBLEGUM" hex="#f472b6" />
                  <ColorSwatch name="SPLASH" hex="#22d3ee" />
                  <ColorSwatch name="SUNSHINE" hex="#facc15" />
                  <ColorSwatch name="MINT" hex="#34d399" />
                  <ColorSwatch name="GRAPE" hex="#a78bfa" />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="cyan">
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► PASTELS</h2>
                <div className="flex flex-wrap gap-6 justify-center">
                  <ColorSwatch name="BLUSH" hex="#fce7f3" />
                  <ColorSwatch name="SKY" hex="#cffafe" />
                  <ColorSwatch name="CREAM" hex="#fef9c3" />
                  <ColorSwatch name="FOAM" hex="#d1fae5" />
                  <ColorSwatch name="CLOUD" hex="#f1f5f9" />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="yellow">
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► THE CREW</h2>
                <div className="flex flex-wrap gap-8 justify-center py-4">
                  <PixelCharacter name="DOT" emoji="🎨" tagline="make it pretty" color="#ec4899" bgColor="#fce7f3" />
                  <PixelCharacter name="PIT" emoji="🎮" tagline="ship it" color="#06b6d4" bgColor="#cffafe" />
                  <PixelCharacter name="BUG" emoji="🔍" tagline="found one" color="#10b981" bgColor="#d1fae5" />
                  <PixelCharacter name="CHIP" emoji="🎵" tagline="turn it up" color="#f59e0b" bgColor="#fef3c7" />
                </div>
              </PlayCard>
            </div>
          )}

          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="space-y-6">
              <PlayCard className="p-6" accent="pink">
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► BUTTONS</h2>
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
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► GAME SELECT</h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <GameCard title="Memory" icon="🧠" color="#ec4899" bgColor="#fce7f3" />
                  <GameCard title="Snake" icon="🐍" color="#10b981" bgColor="#d1fae5" />
                  <GameCard title="Dodge" icon="⚡" color="#f59e0b" bgColor="#fef3c7" />
                  <GameCard title="Whack" icon="🔨" color="#06b6d4" bgColor="#cffafe" />
                  <GameCard title="React" icon="👆" color="#8b5cf6" bgColor="#ede9fe" />
                  <GameCard title="Soon" icon="✦" color="#94a3b8" bgColor="#f1f5f9" />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="yellow">
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► DIALOG BOX</h2>
                <div className="max-w-sm mx-auto bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <div className="border-b-2 border-slate-200 pb-2 mb-3 flex items-center justify-between">
                    <span className={`text-xs text-slate-400 ${pixelText}`}>NICE!</span>
                    <span className="text-pink-400 cursor-pointer hover:text-pink-500">✕</span>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className={`text-xl text-pink-500 mb-2 ${pixelText}`}>LEVEL CLEAR!</h3>
                    <p className={`text-sm text-slate-400 mb-4 ${pixelText}`}>SCORE: 012450</p>
                    <div className="flex gap-3 justify-center">
                      <PixelButton variant="ghost" size="sm">MENU</PixelButton>
                      <PixelButton variant="primary" size="sm">NEXT</PixelButton>
                    </div>
                  </div>
                </div>
              </PlayCard>
            </div>
          )}

          {/* Gameplay UI Tab */}
          {activeTab === 'gameplay' && (
            <div className="space-y-6">
              <PlayCard className="p-6" accent="pink">
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► STATS</h2>
                <div className="flex flex-wrap gap-8 items-center justify-center">
                  <PixelScore score={12450} label="SCORE" color="pink" />
                  <PixelScore score={8} label="LEVEL" color="cyan" />
                  <PixelTimer seconds={127} />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="cyan">
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► HEALTH</h2>
                <div className="flex flex-wrap gap-8 items-center justify-center">
                  <PixelHealth current={8} max={10} color="pink" />
                  <PixelHealth current={4} max={10} color="cyan" />
                  <PixelHealth current={1} max={10} color="red" />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="yellow">
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► ITEMS</h2>
                <div className="flex flex-wrap gap-6 items-center justify-center py-4">
                  <PixelItem icon="⚡" label="SPEED" color="#fef3c7" />
                  <PixelItem icon="🛡️" label="SHIELD" color="#cffafe" />
                  <PixelItem icon="💖" label="HP+" color="#fce7f3" />
                  <PixelItem icon="⭐" label="STAR" color="#ede9fe" />
                  <PixelItem icon="🍎" label="SNACK" color="#fee2e2" />
                  <PixelItem icon="🍀" label="LUCKY" color="#d1fae5" />
                </div>
              </PlayCard>

              <PlayCard className="p-6" accent="pink">
                <h2 className={`text-lg text-pink-500 mb-4 ${pixelText}`}>► ACHIEVEMENT</h2>
                <div className="max-w-md mx-auto bg-yellow-50 border-2 border-black p-3 flex items-center gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <div 
                    className="w-10 h-10 bg-yellow-300 border-2 border-black flex items-center justify-center text-xl"
                    style={{ boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }}
                  >
                    🏆
                  </div>
                  <div>
                    <div className={`text-yellow-600 text-sm ${pixelText}`}>UNLOCKED!</div>
                    <div className={`text-xs text-slate-500 ${pixelText}`}>SPEEDY — clear in &lt;30s</div>
                  </div>
                </div>
              </PlayCard>
            </div>
          )}

          {/* Game Mockup Tab */}
          {activeTab === 'mockup' && (
            <div className="space-y-6">
              <div 
                className="max-w-md mx-auto bg-white border-4 border-black overflow-hidden"
                style={{
                  boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
                }}
              >
                {/* Top bar */}
                <div className="bg-pink-100 border-b-2 border-black px-3 py-2 flex justify-between items-center">
                  <div className={`text-[10px] text-pink-400 ${pixelText}`}>LVL 08</div>
                  <PixelScore score={4280} label="" color="pink" />
                  <PixelTimer seconds={45} />
                </div>

                {/* Game Area */}
                <div className="aspect-square bg-slate-50 relative">
                  {/* Grid */}
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                  
                  {/* Game elements */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Collectibles */}
                      <div className="absolute -top-20 -left-20 w-6 h-6 bg-pink-300 border-2 border-black" />
                      <div className="absolute -top-12 left-16 w-4 h-4 bg-yellow-300 border border-black animate-pulse" />
                      <div className="absolute top-8 -left-24 w-4 h-4 bg-emerald-300 border border-black" />
                      <div className="absolute -top-4 left-24 w-5 h-5 bg-purple-300 border border-black" />
                      
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
                <div className="bg-cyan-100 border-t-2 border-black px-3 py-2 flex justify-between items-center">
                  <PixelHealth current={7} max={10} color="pink" />
                  <div className="flex gap-2">
                    <PixelItem icon="⚡" label="" color="#fef3c7" />
                    <PixelItem icon="🛡️" label="" color="#cffafe" />
                  </div>
                </div>
              </div>

              <div className={`text-center text-slate-400 text-xs ${pixelText}`}>
                ↑ GAMEPLAY MOCKUP — BRIGHT & FRIENDLY
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <Marquee text="PLAY MORE • SMILE MORE • MADE WITH JOY" />
        <div className={`text-center mt-6 text-slate-400 text-xs ${pixelText}`}>
          <span className="text-pink-500">PIXEL</span>
          <span className="text-cyan-500">PIT</span>
          <span className="ml-2">✦ small games. big smiles.</span>
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

export default PixelPitPlayroom;
