import React, { useState } from 'react';

const PixelPitStyleGuide = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm tracking-widest transition-all rounded-xl font-mono lowercase ${
        activeTab === id 
          ? 'bg-amber-400 text-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.4)]' 
          : 'bg-slate-800/50 text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );

  const ColorSwatch = ({ color, name, hex, glow }) => (
    <div className="flex flex-col items-center gap-3">
      <div 
        className="w-16 h-16 rounded-2xl"
        style={{ 
          backgroundColor: hex,
          boxShadow: glow ? `0 0 30px ${hex}40, 0 0 60px ${hex}20` : 'none'
        }}
      />
      <span className="text-sm text-slate-300 font-mono">{name}</span>
      <span className="text-xs text-slate-500 font-mono">{hex}</span>
    </div>
  );

  const GlowButton = ({ variant = 'primary', children }) => {
    const variants = {
      primary: {
        bg: 'bg-amber-400',
        text: 'text-slate-900',
        shadow: '0 0 30px rgba(251,191,36,0.5), 0 8px 20px rgba(0,0,0,0.3)',
        hover: 'hover:shadow-[0_0_40px_rgba(251,191,36,0.6),0_8px_25px_rgba(0,0,0,0.3)]'
      },
      secondary: {
        bg: 'bg-cyan-400',
        text: 'text-slate-900',
        shadow: '0 0 30px rgba(34,211,238,0.5), 0 8px 20px rgba(0,0,0,0.3)',
        hover: 'hover:shadow-[0_0_40px_rgba(34,211,238,0.6),0_8px_25px_rgba(0,0,0,0.3)]'
      },
      ghost: {
        bg: 'bg-transparent border-2 border-cyan-400/50',
        text: 'text-cyan-400',
        shadow: 'none',
        hover: 'hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]'
      },
      dark: {
        bg: 'bg-slate-800/80 border border-slate-700',
        text: 'text-slate-300',
        shadow: 'none',
        hover: 'hover:bg-slate-700/80 hover:border-slate-600'
      }
    };
    
    const v = variants[variant];
    return (
      <button 
        className={`px-6 py-3 rounded-xl font-mono lowercase tracking-wider transition-all ${v.bg} ${v.text} ${v.hover}`}
        style={{ boxShadow: v.shadow }}
      >
        {children}
      </button>
    );
  };

  const GameCard = ({ title, icon, active }) => (
    <div 
      className={`flex flex-col items-center gap-3 p-6 rounded-2xl transition-all cursor-pointer ${
        active 
          ? 'bg-slate-800/60 border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.2)]' 
          : 'bg-slate-800/40 border-2 border-transparent hover:bg-slate-800/60 hover:border-slate-700'
      }`}
    >
      <span className="text-4xl">{icon}</span>
      <span className={`font-mono text-sm ${active ? 'text-amber-400' : 'text-slate-400'}`}>{title}</span>
      {active && <span className="text-xs text-slate-500 font-mono">Tue 1/27</span>}
    </div>
  );

  const CharacterCard = ({ name, role, tagline, emoji, bgColor }) => (
    <div className="flex flex-col items-center">
      <div 
        className="w-32 h-40 rounded-3xl mb-4 flex items-center justify-center text-6xl"
        style={{ backgroundColor: bgColor }}
      >
        {emoji}
      </div>
      <h3 className="text-lg font-bold" style={{ color: bgColor === '#fce7f3' ? '#ec4899' : bgColor === '#fef3c7' ? '#f59e0b' : bgColor === '#d1fae5' ? '#10b981' : '#8b5cf6' }}>
        {name}
      </h3>
      <p className="text-slate-400 text-sm">{role}</p>
      <p className="text-slate-500 text-xs italic">"{tagline}"</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />
      
      <div className="relative z-10 p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-pink-500">PIXEL</span>
            <span className="text-cyan-400">PIT</span>
          </h1>
          <p className="text-slate-500 font-mono lowercase tracking-widest">
            art style guide • soft glow edition
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <TabButton id="overview" label="overview" />
          <TabButton id="colors" label="colors" />
          <TabButton id="typography" label="type" />
          <TabButton id="components" label="components" />
          <TabButton id="principles" label="principles" />
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Style Name */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Style Name</h2>
              <div className="text-center py-8">
                <h3 className="text-4xl font-bold text-white mb-4">"Soft Glow Arcade"</h3>
                <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  A modern, approachable game aesthetic that combines dark atmospheric backgrounds 
                  with warm, glowing UI elements. Think cozy arcade meets premium mobile gaming.
                </p>
              </div>
            </div>

            {/* Key Characteristics */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Key Characteristics</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 text-lg font-mono mb-2">✦ Soft & Rounded</div>
                  <p className="text-slate-400 text-sm">
                    Everything has generous border-radius (16-24px). No sharp corners, no hard edges. 
                    Shapes feel friendly and touchable.
                  </p>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 text-lg font-mono mb-2">✦ Ambient Glow</div>
                  <p className="text-slate-400 text-sm">
                    Interactive elements emit soft light halos. Buttons, scores, and active states 
                    all have diffused glows that feel warm and inviting.
                  </p>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 text-lg font-mono mb-2">✦ Dark Canvas</div>
                  <p className="text-slate-400 text-sm">
                    Deep slate/navy backgrounds (not pure black) create depth. The darkness makes 
                    glowing elements pop without feeling harsh.
                  </p>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 text-lg font-mono mb-2">✦ Warm + Cool</div>
                  <p className="text-slate-400 text-sm">
                    Primary actions use warm amber/gold. Secondary/info uses cool cyan. 
                    This creates natural visual hierarchy and balance.
                  </p>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 text-lg font-mono mb-2">✦ Minimal & Clean</div>
                  <p className="text-slate-400 text-sm">
                    Lots of negative space. UI elements breathe. Information is presented 
                    simply with clear focus points.
                  </p>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 text-lg font-mono mb-2">✦ Lowercase Mono</div>
                  <p className="text-slate-400 text-sm">
                    UI text is lowercase monospace with wide letter-spacing. 
                    Feels techy but approachable, never shouty.
                  </p>
                </div>
              </div>
            </div>

            {/* Mood Board Reference */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Reference Games</h2>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-3xl mb-3">🎵</div>
                  <div className="text-white font-medium">Sayonara Wild Hearts</div>
                  <div className="text-slate-500 text-sm">Neon glow, rhythm, atmosphere</div>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-3xl mb-3">🏔️</div>
                  <div className="text-white font-medium">Alto's Odyssey</div>
                  <div className="text-slate-500 text-sm">Minimal UI, soft lighting</div>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-3xl mb-3">🔺</div>
                  <div className="text-white font-medium">Monument Valley</div>
                  <div className="text-slate-500 text-sm">Clean shapes, premium feel</div>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-3xl mb-3">⭐</div>
                  <div className="text-white font-medium">Stardew Valley</div>
                  <div className="text-slate-500 text-sm">Cozy, friendly characters</div>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-3xl mb-3">🎮</div>
                  <div className="text-white font-medium">Nintendo eShop</div>
                  <div className="text-slate-500 text-sm">Card layouts, polish</div>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-3xl mb-3">📱</div>
                  <div className="text-white font-medium">Apple Arcade</div>
                  <div className="text-slate-500 text-sm">Premium mobile gaming</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="space-y-8">
            {/* Primary Palette */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Primary Palette</h2>
              <div className="flex flex-wrap gap-8 justify-center">
                <ColorSwatch name="Amber Glow" hex="#fbbf24" glow />
                <ColorSwatch name="Cyan Accent" hex="#22d3ee" glow />
                <ColorSwatch name="Slate Deep" hex="#0f172a" />
                <ColorSwatch name="Slate Mid" hex="#1e293b" />
              </div>
              <div className="mt-8 bg-slate-800/30 rounded-2xl p-6">
                <h3 className="text-cyan-400 font-mono mb-3">Usage Rules</h3>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li>• <span className="text-amber-400">Amber</span> = Primary actions, scores, important numbers, "play" buttons</li>
                  <li>• <span className="text-cyan-400">Cyan</span> = Secondary actions, info text, navigation, links</li>
                  <li>• Slate backgrounds create depth layers (darker = further back)</li>
                  <li>• Add glow halos to interactive/important elements only</li>
                </ul>
              </div>
            </div>

            {/* Character Colors */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Character Palette</h2>
              <div className="flex flex-wrap gap-8 justify-center">
                <ColorSwatch name="Dot Pink" hex="#ec4899" glow />
                <ColorSwatch name="Pit Orange" hex="#f59e0b" glow />
                <ColorSwatch name="Bug Mint" hex="#10b981" glow />
                <ColorSwatch name="Chip Purple" hex="#8b5cf6" glow />
              </div>
              <div className="mt-8 flex flex-wrap gap-4 justify-center">
                <div className="w-20 h-20 rounded-2xl bg-pink-100" />
                <div className="w-20 h-20 rounded-2xl bg-amber-100" />
                <div className="w-20 h-20 rounded-2xl bg-emerald-100" />
                <div className="w-20 h-20 rounded-2xl bg-violet-100" />
              </div>
              <p className="text-center text-slate-500 text-sm mt-4">
                Character cards use soft pastel backgrounds with saturated accent text
              </p>
            </div>

            {/* Glow Effects */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Glow Recipes</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div 
                    className="w-24 h-24 mx-auto rounded-2xl bg-amber-400 mb-4"
                    style={{ boxShadow: '0 0 40px rgba(251,191,36,0.5), 0 0 80px rgba(251,191,36,0.2)' }}
                  />
                  <code className="text-xs text-slate-400 font-mono block">
                    box-shadow: 0 0 40px rgba(251,191,36,0.5),<br/>
                    0 0 80px rgba(251,191,36,0.2)
                  </code>
                </div>
                <div className="text-center">
                  <div 
                    className="w-24 h-24 mx-auto rounded-2xl bg-cyan-400 mb-4"
                    style={{ boxShadow: '0 0 40px rgba(34,211,238,0.5), 0 0 80px rgba(34,211,238,0.2)' }}
                  />
                  <code className="text-xs text-slate-400 font-mono block">
                    box-shadow: 0 0 40px rgba(34,211,238,0.5),<br/>
                    0 0 80px rgba(34,211,238,0.2)
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="space-y-8">
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Typography Style</h2>
              
              <div className="space-y-8">
                {/* Game Title */}
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-xs text-slate-500 font-mono mb-2 uppercase tracking-wider">Game Title</div>
                  <div className="text-5xl font-bold tracking-wide text-amber-400" style={{ textShadow: '0 0 40px rgba(251,191,36,0.4)' }}>
                    BEAM
                  </div>
                  <div className="text-slate-500 text-sm mt-3 font-mono">
                    Font: Bold, tracking-wide, ALL CAPS, amber with glow
                  </div>
                </div>

                {/* Tagline */}
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-xs text-slate-500 font-mono mb-2 uppercase tracking-wider">Tagline / Instructions</div>
                  <div className="text-xl font-mono tracking-widest text-cyan-400 lowercase">
                    dodge the light
                  </div>
                  <div className="text-slate-500 text-sm mt-3 font-mono">
                    Font: Mono, tracking-widest, lowercase, cyan
                  </div>
                </div>

                {/* UI Labels */}
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-xs text-slate-500 font-mono mb-2 uppercase tracking-wider">UI Labels</div>
                  <div className="flex gap-6 items-center">
                    <span className="text-slate-400 font-mono tracking-wider lowercase">level 1</span>
                    <span className="text-slate-400 font-mono tracking-wider lowercase">score</span>
                    <span className="text-slate-400 font-mono tracking-wider lowercase">game over</span>
                  </div>
                  <div className="text-slate-500 text-sm mt-3 font-mono">
                    Font: Mono, lowercase, muted colors, wide tracking
                  </div>
                </div>

                {/* Score / Numbers */}
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-xs text-slate-500 font-mono mb-2 uppercase tracking-wider">Scores & Numbers</div>
                  <div 
                    className="text-6xl font-mono text-amber-400"
                    style={{ textShadow: '0 0 30px rgba(251,191,36,0.5)' }}
                  >
                    0
                  </div>
                  <div className="text-slate-500 text-sm mt-3 font-mono">
                    Font: Mono, large, amber with glow halo
                  </div>
                </div>

                {/* Button Text */}
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-xs text-slate-500 font-mono mb-2 uppercase tracking-wider">Button Text</div>
                  <div className="flex gap-4 flex-wrap">
                    <span className="bg-amber-400 text-slate-900 px-6 py-2 rounded-xl font-mono tracking-wider lowercase">play</span>
                    <span className="bg-cyan-400 text-slate-900 px-6 py-2 rounded-xl font-mono tracking-wider lowercase">play again</span>
                    <span className="border border-slate-600 text-slate-400 px-6 py-2 rounded-xl font-mono tracking-wider lowercase">leaderboard</span>
                  </div>
                  <div className="text-slate-500 text-sm mt-3 font-mono">
                    Font: Mono, lowercase, tracking-wider
                  </div>
                </div>
              </div>
            </div>

            {/* Font Recommendations */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Font Recommendations</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 font-mono mb-2">Primary: Space Mono</div>
                  <p className="text-slate-400 text-sm">Clean monospace with personality. Great for UI text and numbers.</p>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 font-mono mb-2">Alt: JetBrains Mono</div>
                  <p className="text-slate-400 text-sm">Modern, highly legible. Good for dense information.</p>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 font-mono mb-2">Display: Outfit / Poppins</div>
                  <p className="text-slate-400 text-sm">For larger titles when you want geometric sans.</p>
                </div>
                <div className="bg-slate-800/30 rounded-2xl p-6">
                  <div className="text-cyan-400 font-mono mb-2">System Fallback: ui-monospace</div>
                  <p className="text-slate-400 text-sm">SF Mono on Mac, Consolas on Windows.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'components' && (
          <div className="space-y-8">
            {/* Buttons */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Buttons</h2>
              <div className="flex flex-wrap gap-4 justify-center items-center">
                <GlowButton variant="primary">play</GlowButton>
                <GlowButton variant="secondary">play again</GlowButton>
                <GlowButton variant="ghost">share</GlowButton>
                <GlowButton variant="dark">leaderboard</GlowButton>
              </div>
              <div className="mt-6 bg-slate-800/30 rounded-2xl p-4">
                <h3 className="text-cyan-400 font-mono text-sm mb-2">Button Rules</h3>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Generous padding (px-6 py-3 minimum)</li>
                  <li>• Border radius 12-16px</li>
                  <li>• Primary buttons get glow halos</li>
                  <li>• Ghost buttons use border + subtle hover glow</li>
                </ul>
              </div>
            </div>

            {/* Game Cards */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Game Cards</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <GameCard title="Beam" icon="⚡" active />
                <GameCard title="Lucky" icon="🎲" />
                <GameCard title="Memory" icon="🧠" />
                <GameCard title="Snake" icon="🐍" />
                <GameCard title="Whack" icon="⛏️" />
                <GameCard title="Soon" icon="✨" />
              </div>
              <div className="mt-6 bg-slate-800/30 rounded-2xl p-4">
                <h3 className="text-cyan-400 font-mono text-sm mb-2">Card Rules</h3>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Semi-transparent backgrounds (bg-slate-800/40)</li>
                  <li>• Large rounded corners (16-24px)</li>
                  <li>• Active state: amber border + subtle glow</li>
                  <li>• Hover: slightly more opaque background</li>
                </ul>
              </div>
            </div>

            {/* Input Fields */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Input Fields</h2>
              <div className="max-w-sm mx-auto">
                <input 
                  type="text" 
                  defaultValue="Amy"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-center font-mono text-slate-300 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                />
              </div>
              <div className="mt-6 bg-slate-800/30 rounded-2xl p-4">
                <h3 className="text-cyan-400 font-mono text-sm mb-2">Input Rules</h3>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Dark semi-transparent background</li>
                  <li>• Subtle border (slate-700)</li>
                  <li>• Focus: cyan border + subtle glow</li>
                  <li>• Centered text for name inputs</li>
                </ul>
              </div>
            </div>

            {/* Character Cards */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Character Cards</h2>
              <div className="flex flex-wrap gap-8 justify-center">
                <CharacterCard name="Dot" role="Creative Director" tagline="Make it pretty." emoji="🎨" bgColor="#fce7f3" />
                <CharacterCard name="Pit" role="Lead Developer" tagline="Ship it." emoji="🎮" bgColor="#fef3c7" />
                <CharacterCard name="Bug" role="QA Lead" tagline="Found one." emoji="🔍" bgColor="#d1fae5" />
                <CharacterCard name="Chip" role="Audio Lead" tagline="Turn it up." emoji="🎵" bgColor="#ede9fe" />
              </div>
              <div className="mt-6 bg-slate-800/30 rounded-2xl p-4">
                <h3 className="text-cyan-400 font-mono text-sm mb-2">Character Card Rules</h3>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Pastel background colors (not the character's accent color)</li>
                  <li>• Large rounded corners (24px)</li>
                  <li>• Name in character's accent color</li>
                  <li>• Role and tagline in muted slate tones</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'principles' && (
          <div className="space-y-8">
            {/* Do / Don't */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Design Principles</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* DO */}
                <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-6">
                  <h3 className="text-emerald-400 font-mono text-lg mb-4">✓ DO</h3>
                  <ul className="space-y-3 text-slate-300 text-sm">
                    <li className="flex gap-2">
                      <span className="text-emerald-400">•</span>
                      Use soft, generous border-radius (16-24px)
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400">•</span>
                      Add glow effects to interactive elements
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400">•</span>
                      Keep backgrounds dark but not pure black
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400">•</span>
                      Use lowercase monospace for UI text
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400">•</span>
                      Let elements breathe with negative space
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400">•</span>
                      Use emoji for game icons - it's playful!
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400">•</span>
                      Make buttons chunky and tappable
                    </li>
                  </ul>
                </div>

                {/* DON'T */}
                <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-6">
                  <h3 className="text-red-400 font-mono text-lg mb-4">✗ DON'T</h3>
                  <ul className="space-y-3 text-slate-300 text-sm">
                    <li className="flex gap-2">
                      <span className="text-red-400">•</span>
                      Use sharp corners or hard edges
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-400">•</span>
                      Make things look pixelated or retro-8bit
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-400">•</span>
                      Use pure black (#000) backgrounds
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-400">•</span>
                      Shout with ALL CAPS (except game titles)
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-400">•</span>
                      Crowd the screen with too many elements
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-400">•</span>
                      Use hard drop shadows (offset shadows)
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-400">•</span>
                      Make interactions feel cheap or harsh
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Philosophy */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">The Philosophy</h2>
              <div className="space-y-6 max-w-2xl mx-auto text-center">
                <blockquote className="text-xl text-slate-300 italic">
                  "Games should feel like a warm arcade on a rainy night. 
                  The glow draws you in. The softness keeps you there."
                </blockquote>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-800/30 rounded-xl p-4">
                    <div className="text-amber-400 font-mono mb-1">Approachable</div>
                    <p className="text-slate-500">Anyone should feel welcome</p>
                  </div>
                  <div className="bg-slate-800/30 rounded-xl p-4">
                    <div className="text-cyan-400 font-mono mb-1">Premium</div>
                    <p className="text-slate-500">Feels polished and considered</p>
                  </div>
                  <div className="bg-slate-800/30 rounded-xl p-4">
                    <div className="text-pink-400 font-mono mb-1">Playful</div>
                    <p className="text-slate-500">Never takes itself too seriously</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Checklist */}
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-slate-800">
              <h2 className="text-2xl font-bold text-amber-400 mb-6 font-mono">Quick Checklist</h2>
              <div className="max-w-lg mx-auto space-y-3">
                {[
                  'Are all corners rounded (16px+)?',
                  'Do primary buttons have a glow halo?',
                  'Is the background dark slate (not black)?',
                  'Is UI text lowercase monospace?',
                  'Is there enough breathing room?',
                  'Does amber = action, cyan = info?',
                  'Would a 10-year-old find this friendly?',
                  'Would an adult find this premium?'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-800/30 rounded-xl p-3">
                    <div className="w-5 h-5 rounded border-2 border-slate-600" />
                    <span className="text-slate-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-600 font-mono text-sm">
            <span className="text-pink-500">pixel</span>
            <span className="text-cyan-400">pit</span>
            <span className="ml-2">• soft glow arcade • small games. big energy.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PixelPitStyleGuide;
