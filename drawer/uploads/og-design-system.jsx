import { useState } from 'react';

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// === 25 COLOR PALETTES: 5 PER CONTENT TYPE ===

const PALETTES = {
  // MUSIC: Club nights, neon, electronic energy
  music: [
    { bg: '#0a0014', fg: '#00fff2', accent: '#ff00aa', name: 'Neon Club' },
    { bg: '#1a0505', fg: '#ff6b35', accent: '#ffba08', name: 'Sunset Rave' },
    { bg: '#000000', fg: '#ff0844', accent: '#ffffff', name: 'Redline' },
    { bg: '#0d1b2a', fg: '#7fdbca', accent: '#3d5a80', name: 'Midnight Set' },
    { bg: '#1c1c1c', fg: '#f0f0f0', accent: '#4a4a4a', name: 'Warehouse' },
  ],
  
  // DRAWINGS: Painterly, artistic, expressive materials
  drawings: [
    { bg: '#0a1628', fg: '#fdf6e3', accent: '#c9a959', name: 'Oil Paint' },
    { bg: '#2d3a3a', fg: '#e8d5c4', accent: '#8b4557', name: 'Watercolor' },
    { bg: '#3a3632', fg: '#e8e4df', accent: '#6b6560', name: 'Charcoal' },
    { bg: '#9e4a3a', fg: '#ffecd2', accent: '#5c2d23', name: 'Gouache' },
    { bg: '#1a1a2e', fg: '#ff8a80', accent: '#4a3f6b', name: 'Ink Wash' },
  ],
  
  // REFLECTIONS: Contemplative, natural, serene gradients
  reflections: [
    { bg: '#2a1f3d', fg: '#ffd6e0', accent: '#9d8cbe', name: 'Dawn' },
    { bg: '#134e5e', fg: '#ffdab9', accent: '#1a6b7c', name: 'Dusk' },
    { bg: '#2c3e50', fg: '#bdc3c7', accent: '#34495e', name: 'Still Water' },
    { bg: '#1a2f1a', fg: '#d4c896', accent: '#2d4a2d', name: 'Forest Floor' },
    { bg: '#0c0c14', fg: '#a8c0d6', accent: '#1a1a2e', name: 'Moonlight' },
  ],
  
  // TOYS: Playful, bold, candy-coated joy
  toys: [
    { bg: '#ff2d7a', fg: '#00d4ff', accent: '#ffffff', name: 'Bubblegum' },
    { bg: '#4a00e0', fg: '#7fff00', accent: '#ff00ff', name: 'Arcade' },
    { bg: '#ff6b6b', fg: '#00ffcc', accent: '#ffd93d', name: 'Candy Shop' },
    { bg: '#ffe135', fg: '#6b2d9b', accent: '#ff4081', name: 'Playground' },
    { bg: '#2563eb', fg: '#ff8c42', accent: '#ffffff', name: 'Toy Box' },
  ],
  
  // INVENTIONS: Glitchy, tech, chaotic systems
  inventions: [
    { bg: '#0a0a0a', fg: '#00ff41', accent: '#003b00', name: 'Terminal' },
    { bg: '#0000aa', fg: '#ffffff', accent: '#00aaaa', name: 'Blue Screen' },
    { bg: '#1a1a1a', fg: '#ff00ff', accent: '#00ffff', name: 'Corruption' },
    { bg: '#0a1a0a', fg: '#ffd700', accent: '#1a3a1a', name: 'Circuit' },
    { bg: '#120024', fg: '#ffb000', accent: '#ff4400', name: 'CRT Burn' },
  ],
};

// === BACKGROUND GENERATORS ===

const MusicBackground = ({ seed = 42, palette }) => {
  const bars = Array.from({ length: 32 }, (_, i) => {
    const height = 15 + seededRandom(seed + i * 7) * 85;
    const opacity = 0.2 + seededRandom(seed + i * 13) * 0.4;
    return { height, opacity };
  });
  
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="w-3 mx-px rounded-t"
          style={{
            height: `${bar.height}%`,
            background: `linear-gradient(to top, ${palette.accent}, ${palette.fg})`,
            opacity: bar.opacity,
          }}
        />
      ))}
    </div>
  );
};

const DrawingsBackground = ({ seed = 42, palette }) => {
  const splatters = Array.from({ length: 14 }, (_, i) => ({
    x: seededRandom(seed + i * 3) * 100,
    y: seededRandom(seed + i * 7) * 100,
    size: 60 + seededRandom(seed + i * 11) * 180,
    color: seededRandom(seed + i * 17) > 0.5 ? palette.fg : palette.accent,
    blur: 30 + seededRandom(seed + i * 23) * 50,
    opacity: 0.15 + seededRandom(seed + i * 29) * 0.35,
  }));
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {splatters.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: s.color,
            filter: `blur(${s.blur}px)`,
            opacity: s.opacity,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
};

const ReflectionsBackground = ({ seed = 42, palette }) => {
  const ripples = Array.from({ length: 6 }, (_, i) => ({
    x: 25 + seededRandom(seed + i * 5) * 50,
    y: 30 + seededRandom(seed + i * 9) * 40,
    size: 80 + seededRandom(seed + i * 13) * 250,
  }));
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {ripples.map((r, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: r.size,
            height: r.size,
            border: `1px solid ${palette.fg}20`,
            transform: 'translate(-50%, -50%)',
            boxShadow: `
              0 0 0 15px ${palette.fg}08,
              0 0 0 30px ${palette.fg}05,
              0 0 0 50px ${palette.fg}03
            `,
          }}
        />
      ))}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${palette.accent}30 100%)`,
        }}
      />
    </div>
  );
};

const ToysBackground = ({ seed = 42, palette }) => {
  const shapes = Array.from({ length: 18 }, (_, i) => {
    const type = Math.floor(seededRandom(seed + i * 3) * 3);
    return {
      x: seededRandom(seed + i * 5) * 100,
      y: seededRandom(seed + i * 7) * 100,
      size: 25 + seededRandom(seed + i * 11) * 60,
      rotation: seededRandom(seed + i * 13) * 360,
      type,
      color: seededRandom(seed + i * 17) > 0.5 ? palette.fg : palette.accent,
      opacity: 0.25 + seededRandom(seed + i * 19) * 0.45,
    };
  });
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {shapes.map((s, i) => {
        if (s.type === 2) {
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: 0,
                height: 0,
                borderLeft: `${s.size/2}px solid transparent`,
                borderRight: `${s.size/2}px solid transparent`,
                borderBottom: `${s.size}px solid ${s.color}`,
                transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                opacity: s.opacity,
              }}
            />
          );
        }
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
              opacity: s.opacity,
              background: s.color,
              borderRadius: s.type === 0 ? '50%' : '6px',
            }}
          />
        );
      })}
    </div>
  );
};

const InventionsBackground = ({ seed = 42, palette }) => {
  const lines = Array.from({ length: 25 }, (_, i) => {
    const isHorizontal = seededRandom(seed + i * 3) > 0.5;
    return {
      x: seededRandom(seed + i * 5) * 100,
      y: seededRandom(seed + i * 7) * 100,
      length: 40 + seededRandom(seed + i * 11) * 180,
      isHorizontal,
      hasNode: seededRandom(seed + i * 13) > 0.55,
      glitch: seededRandom(seed + i * 17) > 0.75,
    };
  });
  
  const glitchBars = Array.from({ length: 4 }, (_, i) => ({
    y: seededRandom(seed * 2 + i * 7) * 100,
    height: 2 + seededRandom(seed * 3 + i * 11) * 6,
    opacity: 0.3 + seededRandom(seed * 4 + i * 13) * 0.4,
  }));
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {lines.map((l, i) => (
        <div key={i}>
          <div
            className="absolute"
            style={{
              left: `${l.x}%`,
              top: `${l.y}%`,
              width: l.isHorizontal ? l.length : 2,
              height: l.isHorizontal ? 2 : l.length,
              background: l.glitch ? palette.accent : `${palette.fg}40`,
              boxShadow: l.glitch ? `0 0 12px ${palette.accent}` : 'none',
            }}
          />
          {l.hasNode && (
            <div
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{
                left: `${l.x}%`,
                top: `${l.y}%`,
                background: palette.fg,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 10px ${palette.fg}80`,
              }}
            />
          )}
        </div>
      ))}
      {glitchBars.map((g, i) => (
        <div
          key={`glitch-${i}`}
          className="absolute left-0 right-0"
          style={{
            top: `${g.y}%`,
            height: g.height,
            background: palette.accent,
            opacity: g.opacity,
            mixBlendMode: 'screen',
          }}
        />
      ))}
    </div>
  );
};

// === CONTENT TYPE CONFIG ===

const CONTENT_TYPES = {
  music: {
    label: 'Music',
    icon: '♪',
    Background: MusicBackground,
    description: 'Club nights, neon, electronic energy',
  },
  drawings: {
    label: 'Drawings',
    icon: '✎',
    Background: DrawingsBackground,
    description: 'Painterly, artistic, expressive materials',
  },
  reflections: {
    label: 'Reflections',
    icon: '◐',
    Background: ReflectionsBackground,
    description: 'Contemplative, natural, serene',
  },
  toys: {
    label: 'Toys',
    icon: '◈',
    Background: ToysBackground,
    description: 'Playful, bold, candy-coated joy',
  },
  inventions: {
    label: 'Inventions',
    icon: '⚡',
    Background: InventionsBackground,
    description: 'Glitchy, tech, chaotic systems',
  },
};

const EXAMPLE_TITLES = {
  music: 'PULSE GRID',
  drawings: 'MIDNIGHT GARDEN',
  reflections: 'ON STILLNESS',
  toys: 'PENDULUM',
  inventions: 'DERANGED COOKIES',
};

// === COMPONENTS ===

const OGPreview = ({ type, title, seed, paletteIndex }) => {
  const config = CONTENT_TYPES[type];
  const palette = PALETTES[type][paletteIndex];
  const { Background } = config;
  
  return (
    <div 
      className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl"
      style={{ background: palette.bg }}
    >
      <Background seed={seed} palette={palette} />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
        <div 
          className="text-xs tracking-widest mb-3 uppercase font-medium"
          style={{ color: palette.fg, opacity: 0.6 }}
        >
          {config.icon} {config.label}
        </div>
        <h1 
          className="text-3xl md:text-4xl font-bold tracking-wide text-center uppercase"
          style={{ 
            color: palette.fg,
            textShadow: `0 0 60px ${palette.fg}50`,
          }}
        >
          {title}
        </h1>
        <div 
          className="mt-3 text-sm font-medium"
          style={{ color: palette.fg, opacity: 0.5 }}
        >
          by Amber
        </div>
        <div 
          className="w-16 h-0.5 mt-5 rounded-full"
          style={{ background: palette.accent }}
        />
      </div>
      
      <div 
        className="absolute bottom-3 right-4 text-xs font-medium"
        style={{ color: palette.fg, opacity: 0.3 }}
      >
        intheamber.com
      </div>
      
      <div 
        className="absolute top-3 right-4 text-xs px-2 py-1 rounded"
        style={{ 
          background: `${palette.fg}15`,
          color: palette.fg,
          opacity: 0.7,
        }}
      >
        {palette.name}
      </div>
    </div>
  );
};

const PaletteSwatches = ({ type, selectedIndex, onSelect }) => {
  const palettes = PALETTES[type];
  
  return (
    <div className="flex gap-2">
      {palettes.map((p, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="group relative"
          title={p.name}
        >
          <div 
            className="w-10 h-10 rounded-lg overflow-hidden transition-transform"
            style={{
              transform: selectedIndex === i ? 'scale(1.1)' : 'scale(1)',
              boxShadow: selectedIndex === i ? `0 0 0 2px ${p.fg}` : 'none',
            }}
          >
            <div className="w-full h-1/2" style={{ background: p.bg }} />
            <div className="w-full h-1/2 flex">
              <div className="w-1/2 h-full" style={{ background: p.fg }} />
              <div className="w-1/2 h-full" style={{ background: p.accent }} />
            </div>
          </div>
          <div 
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: '#888' }}
          >
            {p.name}
          </div>
        </button>
      ))}
    </div>
  );
};

export default function OGDesignSystem() {
  const [selectedTypes, setSelectedTypes] = useState(['music', 'toys']);
  const [paletteIndices, setPaletteIndices] = useState({ 
    music: 0, drawings: 0, reflections: 0, toys: 0, inventions: 0 
  });
  const [seeds, setSeeds] = useState({ 
    music: 42, drawings: 123, reflections: 456, toys: 789, inventions: 101 
  });
  
  const regenerate = (type) => {
    setSeeds(prev => ({ ...prev, [type]: Math.floor(Math.random() * 10000) }));
  };
  
  const selectPalette = (type, index) => {
    setPaletteIndices(prev => ({ ...prev, [type]: index }));
  };
  
  return (
    <div className="min-h-screen p-6" style={{ background: '#0a0a0a' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 
            className="text-2xl font-bold mb-1 tracking-wide"
            style={{ color: '#ffffff' }}
          >
            OG Image Design System
          </h1>
          <p className="text-sm" style={{ color: '#666' }}>
            25 palettes across 5 content types. Each type has its own visual language + color family.
          </p>
        </div>
        
        {/* Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(CONTENT_TYPES).map(([key, config]) => {
            const isSelected = selectedTypes.includes(key);
            const palette = PALETTES[key][paletteIndices[key]];
            return (
              <button
                key={key}
                onClick={() => {
                  if (isSelected && selectedTypes.length > 1) {
                    setSelectedTypes(prev => prev.filter(t => t !== key));
                  } else if (!isSelected && selectedTypes.length < 2) {
                    setSelectedTypes(prev => [...prev, key]);
                  } else if (!isSelected) {
                    setSelectedTypes(prev => [prev[0], key]);
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm transition-all font-medium"
                style={{
                  background: isSelected ? palette.fg + '20' : 'transparent',
                  border: `1px solid ${isSelected ? palette.fg : '#333'}`,
                  color: isSelected ? palette.fg : '#666',
                }}
              >
                {config.icon} {config.label}
              </button>
            );
          })}
        </div>
        
        {/* Previews */}
        <div className="space-y-12">
          {selectedTypes.map((type) => {
            const config = CONTENT_TYPES[type];
            const palette = PALETTES[type][paletteIndices[type]];
            
            return (
              <div key={type}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="text-lg font-bold uppercase tracking-wider"
                        style={{ color: palette.fg }}
                      >
                        {config.icon} {config.label}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#666' }}>
                      {config.description}
                    </p>
                  </div>
                  <button
                    onClick={() => regenerate(type)}
                    className="px-3 py-1.5 rounded text-xs transition-all hover:opacity-80 self-start"
                    style={{
                      background: `${palette.fg}15`,
                      color: palette.fg,
                      border: `1px solid ${palette.fg}30`,
                    }}
                  >
                    ↻ Regenerate
                  </button>
                </div>
                
                {/* Palette Selector */}
                <div className="mb-6">
                  <div className="text-xs mb-3" style={{ color: '#555' }}>
                    Color Palette:
                  </div>
                  <PaletteSwatches 
                    type={type}
                    selectedIndex={paletteIndices[type]}
                    onSelect={(i) => selectPalette(type, i)}
                  />
                </div>
                
                {/* Preview */}
                <OGPreview 
                  type={type}
                  title={EXAMPLE_TITLES[type]}
                  seed={seeds[type]}
                  paletteIndex={paletteIndices[type]}
                />
              </div>
            );
          })}
        </div>
        
        {/* Full Palette Reference */}
        <div 
          className="mt-16 p-6 rounded-xl"
          style={{ background: '#111' }}
        >
          <h2 className="text-sm font-bold mb-6 uppercase tracking-wider" style={{ color: '#fff' }}>
            Complete Palette Reference
          </h2>
          
          <div className="space-y-6">
            {Object.entries(PALETTES).map(([type, palettes]) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs uppercase tracking-wider font-medium" style={{ color: '#888' }}>
                    {CONTENT_TYPES[type].icon} {CONTENT_TYPES[type].label}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {palettes.map((p, i) => (
                    <div key={i} className="space-y-1">
                      <div 
                        className="h-12 rounded-lg flex items-end p-2"
                        style={{ background: p.bg }}
                      >
                        <div className="flex gap-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ background: p.fg }}
                          />
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ background: p.accent }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-center" style={{ color: '#555' }}>
                        {p.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Design Notes */}
        <div 
          className="mt-8 p-6 rounded-xl"
          style={{ background: '#111' }}
        >
          <h2 className="text-sm font-bold mb-4 uppercase tracking-wider" style={{ color: '#fff' }}>
            Design Notes
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-xs" style={{ color: '#888' }}>
            <div>
              <strong style={{ color: '#fff' }}>Music</strong> — Neon to muted, always high contrast. Equalizer bars scale with energy.
            </div>
            <div>
              <strong style={{ color: '#fff' }}>Drawings</strong> — Warm, material-inspired. Splatters feel like paint, not code.
            </div>
            <div>
              <strong style={{ color: '#fff' }}>Reflections</strong> — Soft, contemplative. Ripples suggest depth without distraction.
            </div>
            <div>
              <strong style={{ color: '#fff' }}>Toys</strong> — Bold, saturated, joyful. Shapes bounce visually.
            </div>
            <div className="sm:col-span-2">
              <strong style={{ color: '#fff' }}>Inventions</strong> — Glitchy, system-aesthetic. Terminal greens, BSOD blues, CRT burns.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
