'use client'

import { useState, useRef } from 'react'

const APPS = [
  { id: 47, name: 'QuietTab', tagline: 'A browser tab that helps you breathe between tasks', color: '#FFD23F', icon: '💨', status: 'SHIPPED', date: 'Feb 15' },
  { id: 46, name: 'ForkIt', tagline: 'Remix any recipe by swapping one ingredient', color: '#FF3860', icon: '🍴', status: 'SHIPPED', date: 'Feb 14' },
  { id: 45, name: 'DriftFM', tagline: 'AI radio that matches your walking speed', color: '#00E5A0', icon: '📻', status: 'SHIPPED', date: 'Feb 13' },
  { id: 44, name: 'SnapDebt', tagline: 'Photograph a receipt, split it instantly with friends', color: '#A855F7', icon: '📸', status: 'SHIPPED', date: 'Feb 12' },
  { id: 43, name: 'MoodBoard', tagline: 'Your daily emotion as a generated color palette', color: '#00B4D8', icon: '🎨', status: 'SHIPPED', date: 'Feb 11' },
  { id: 42, name: 'ParkPing', tagline: 'Alerts you 5 minutes before your parking meter expires', color: '#FFD23F', icon: '🅿️', status: 'SHIPPED', date: 'Feb 10' },
  { id: 41, name: 'TinyWin', tagline: "Log one small win per day. That's it. That's the app.", color: '#FF3860', icon: '🏆', status: 'SHIPPED', date: 'Feb 9' },
  { id: 40, name: 'GhostNote', tagline: 'Leave voice notes at locations for friends to find', color: '#00E5A0', icon: '👻', status: 'SHIPPED', date: 'Feb 8' },
]

function ShapeToken({ shape, color, size = 28, style = {} }: { shape: string; color: string; size?: number; style?: React.CSSProperties }) {
  const inner = size * 0.4
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.18, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'rgba(255,255,255,0.12)', borderRadius: `${size * 0.18}px ${size * 0.18}px 0 0` }} />
      <svg width={inner} height={inner} viewBox="0 0 20 20" style={{ position: 'relative', zIndex: 1 }}>
        {shape === 'diamond' && <polygon points="10,2 18,10 10,18 2,10" fill="#0D1117" />}
        {shape === 'triangle' && <polygon points="10,3 18,17 2,17" fill="#0D1117" />}
        {shape === 'circle' && <circle cx="10" cy="10" r="6" fill="none" stroke="#0D1117" strokeWidth="3" />}
        {shape === 'square' && <rect x="4" y="4" width="12" height="12" rx="2" fill="#0D1117" />}
      </svg>
    </div>
  )
}

function FloatingTokens() {
  const tokens = [
    { x: '8%', y: '15%', rot: -18, shape: 'diamond', color: '#FF3860', size: 32, opacity: 0.3, delay: 0 },
    { x: '88%', y: '12%', rot: 22, shape: 'triangle', color: '#00E5A0', size: 28, opacity: 0.25, delay: 1 },
    { x: '5%', y: '45%', rot: 10, shape: 'circle', color: '#A855F7', size: 26, opacity: 0.2, delay: 2 },
    { x: '92%', y: '38%', rot: -14, shape: 'diamond', color: '#FFD23F', size: 30, opacity: 0.22, delay: 0.5 },
    { x: '12%', y: '72%', rot: 8, shape: 'square', color: '#00B4D8', size: 24, opacity: 0.18, delay: 1.5 },
    { x: '90%', y: '68%', rot: -20, shape: 'triangle', color: '#FF3860', size: 26, opacity: 0.2, delay: 3 },
    { x: '3%', y: '88%', rot: 15, shape: 'diamond', color: '#FFD23F', size: 22, opacity: 0.15, delay: 2.5 },
    { x: '95%', y: '85%', rot: -8, shape: 'circle', color: '#00E5A0', size: 24, opacity: 0.18, delay: 1.8 },
  ]
  return (
    <>
      {tokens.map((t, i) => (
        <div key={i} style={{ position: 'fixed', left: t.x, top: t.y, transform: `rotate(${t.rot}deg)`, opacity: t.opacity, zIndex: 1, animation: `tokenFloat 6s ease-in-out ${t.delay}s infinite alternate` }}>
          <ShapeToken shape={t.shape} color={t.color} size={t.size} />
        </div>
      ))}
    </>
  )
}

function VendingMachine({ onDispense, dispensing, dispensedApp }: { onDispense: () => void; dispensing: boolean; dispensedApp: typeof APPS[0] | null }) {
  return (
    <div style={{ position: 'relative', width: 320, margin: '0 auto' }}>
      {/* NEW badge */}
      <div style={{ position: 'absolute', top: -12, right: -16, background: '#FFD23F', color: '#0D1117', fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 13, letterSpacing: 2, padding: '6px 14px', borderRadius: 8, zIndex: 5 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'rgba(255,255,255,0.15)', borderRadius: '8px 8px 0 0' }} />
        <span style={{ position: 'relative' }}>NEW</span>
      </div>

      {/* Machine body */}
      <div style={{ background: '#0066FF', borderRadius: 28, padding: 14, position: 'relative', boxShadow: '12px 12px 0 rgba(0,0,0,0.3)' }}>
        <div style={{ background: '#003DB8', borderRadius: 20, padding: 16 }}>
          {/* Screen */}
          <div style={{ background: '#0D1117', borderRadius: 14, padding: 20, minHeight: 180, position: 'relative', overflow: 'hidden' }}>
            {/* Scan lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${20 + i * 20}%`, height: 1, background: 'rgba(0,102,255,0.08)' }} />
            ))}

            {/* TODAY badge */}
            <div style={{ display: 'inline-block', background: '#FFD23F', color: '#0D1117', fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11, letterSpacing: 3, padding: '5px 12px', borderRadius: 6, marginBottom: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'rgba(255,255,255,0.15)', borderRadius: '6px 6px 0 0' }} />
              <span style={{ position: 'relative' }}>TODAY</span>
            </div>

            {/* Star / content area */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 8 }}>
              {dispensedApp ? (
                <div style={{ textAlign: 'center', animation: 'slideUp 0.5s ease-out' }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>{dispensedApp.icon}</div>
                  <div style={{ color: dispensedApp.color, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>{dispensedApp.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Space Mono', monospace", fontSize: 11, marginTop: 6, maxWidth: 200, lineHeight: 1.4 }}>{dispensedApp.tagline}</div>
                </div>
              ) : (
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <polygon points="40,5 48,28 72,28 52,42 58,66 40,50 22,66 28,42 8,28 32,28" fill="#FFD23F" style={{ filter: 'drop-shadow(0 0 20px rgba(255,210,63,0.3))' }} />
                  <polygon points="40,14 46,30 60,30 48,39 53,54 40,44 27,54 32,39 20,30 34,30" fill="#FFE77A" opacity="0.5" />
                </svg>
              )}
            </div>
          </div>

          {/* Dispensing slot */}
          <div style={{ background: '#0D1117', borderRadius: 8, height: 20, margin: '14px 30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '85%', height: 10, borderRadius: 5, background: '#001A44' }} />
          </div>

          {/* Button panel */}
          <div style={{ background: '#001A44', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <button
              onClick={onDispense}
              disabled={dispensing}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: dispensing ? '#992240' : '#FF3860',
                border: 'none', cursor: dispensing ? 'not-allowed' : 'pointer',
                position: 'relative',
                boxShadow: dispensing ? 'none' : '0 4px 0 #AA1530, 0 6px 20px rgba(255,56,96,0.4)',
                transform: dispensing ? 'translateY(3px)' : 'none',
                transition: 'all 0.15s ease', flexShrink: 0,
              }}
            >
              <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: dispensing ? 'radial-gradient(circle at 40% 35%, #BB3355, #881530)' : 'radial-gradient(circle at 40% 35%, #FF6080, #FF3860)' }} />
              <span style={{ position: 'relative', color: 'white', fontSize: 24, fontWeight: 'bold', zIndex: 1 }}>{dispensing ? '...' : '▶'}</span>
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ height: 5, borderRadius: 3, background: '#0D1117' }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Machine legs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 30px' }}>
        <div style={{ width: 50, height: 24, background: '#003DB8', borderRadius: '0 0 8px 8px' }} />
        <div style={{ width: 50, height: 24, background: '#003DB8', borderRadius: '0 0 8px 8px' }} />
      </div>
    </div>
  )
}

function AppCard({ app, index, entering }: { app: typeof APPS[0]; index: number; entering: boolean }) {
  const rotations = [-3, 5, -7, 4, -5, 8, -4, 6]
  const rot = rotations[index % rotations.length]

  return (
    <div
      style={{
        background: app.color, borderRadius: 16, padding: 20,
        position: 'relative', overflow: 'hidden',
        transform: `rotate(${rot}deg)`,
        boxShadow: '8px 8px 0 rgba(0,0,0,0.25)',
        transition: 'transform 0.3s ease', cursor: 'pointer',
        animation: entering ? `cardDrop 0.6s ease-out ${index * 0.1}s both` : 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)'; e.currentTarget.style.zIndex = '10' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = `rotate(${rot}deg)`; e.currentTarget.style.zIndex = '1' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.12)', borderRadius: '16px 16px 0 0' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: '#0D1117', letterSpacing: 2, opacity: 0.6 }}>#{String(app.id).padStart(3, '0')}</span>
          <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: '#0D1117', opacity: 0.5 }}>{app.date}</span>
        </div>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 14 }}>{app.icon}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16, color: '#0D1117', marginBottom: 6 }}>{app.name}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#0D1117', opacity: 0.7, lineHeight: 1.5, marginBottom: 14 }}>{app.tagline}</div>
        <div style={{ display: 'inline-block', background: '#0D1117', borderRadius: 6, padding: '4px 10px', fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700, color: app.color, letterSpacing: 2 }}>● {app.status}</div>
      </div>
    </div>
  )
}

function DispensedCards({ apps }: { apps: typeof APPS }) {
  if (apps.length === 0) return null
  return (
    <div style={{ position: 'relative', zIndex: 2, padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: 4, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>SCROLL TO SEE</div>
        <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700, color: 'white', margin: 0, letterSpacing: -1 }}>
          What we&apos;ve <span style={{ color: '#0066FF' }}>shipped</span>
        </h2>
        <div style={{ width: 60, height: 3, background: '#0066FF', margin: '16px auto 0', borderRadius: 2 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 24, maxWidth: 800, margin: '0 auto' }}>
        {apps.map((app, i) => (
          <AppCard key={app.id} app={app} index={i} entering={true} />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 60 }}>
        <div style={{ display: 'inline-flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ background: '#FFD23F', borderRadius: 8, padding: '8px 16px', fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: '#0D1117', letterSpacing: 2, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'rgba(255,255,255,0.12)' }} />
            <span style={{ position: 'relative' }}>⚡ {apps.length} IDEAS SHIPPED</span>
          </div>
          <div style={{ background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.2)', borderRadius: 8, padding: '8px 16px', fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: '#3388FF', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5A0' }} />
            MORE TOMORROW
          </div>
        </div>
      </div>
    </div>
  )
}

const CREW = [
  { name: 'Drift', role: 'Signal Hunter', img: '/shipshot/crew/drift-bg.png', accent: '#00D4FF', bio: 'Scans the noise so you don\'t have to. Drift finds the signal in a sea of trends, memes, and market chatter — then distills it into one sharp insight before anyone else notices.' },
  { name: 'Hype', role: 'Vibes Architect', img: '/shipshot/crew/hype-bg.png', accent: '#FF3366', bio: 'Turns a whisper into a roar. Hype crafts the narrative, writes the copy, and makes sure every launch feels like an event — even if it\'s a to-do list app.' },
  { name: 'Margin', role: 'Numbers Oracle', img: '/shipshot/crew/margin-bg.png', accent: '#10B981', bio: 'The spreadsheet whisperer. Margin runs the models, stress-tests the unit economics, and tells you the hard truth about whether your idea can actually make money.' },
  { name: 'Pixel', role: 'Design Alchemist', img: '/shipshot/crew/pixel-bg.png', accent: '#7C3AED', bio: 'Makes it beautiful or makes it weird — ideally both. Pixel handles UI, brand, and all the visual decisions that turn a prototype into something people screenshot.' },
  { name: 'Ship', role: 'Build Machine', img: '/shipshot/crew/ship-bg.png', accent: '#0066FF', bio: 'Writes the code, wires the API, deploys to prod. Ship doesn\'t debate architecture — Ship builds the thing and fixes it live. Velocity over perfection.' },
]

function DossierBoard() {
  const [openCard, setOpenCard] = useState<number | null>(null)
  const pins = [
    { rot: -4, pinX: '55%', stamp: 'CLEARED FOR SHIPPING', redacted: 'Subject observed near ████ at 03:00' },
    { rot: 3, pinX: '40%', stamp: 'HIGH ENERGY ASSET', redacted: 'Known to ████████ entire marketing budgets' },
    { rot: -2, pinX: '60%', stamp: 'NUMBERS CHECK OUT', redacted: 'Runs ██████ models before breakfast' },
    { rot: 5, pinX: '45%', stamp: 'VISUALLY DANGEROUS', redacted: 'Last seen ████████ a perfectly good wireframe' },
    { rot: -3, pinX: '50%', stamp: 'BUILDS ON SIGHT', redacted: 'Will deploy to prod at ████ without asking' },
  ]

  return (
    <div style={{ position: 'relative', zIndex: 2, padding: '80px 20px 60px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-block',
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 4,
          color: '#FF3860',
          border: '1px solid #FF386044',
          padding: '5px 14px',
          borderRadius: 2,
          marginBottom: 16,
          textTransform: 'uppercase',
        }}>
          Classified // Internal Use Only
        </div>
        <h2 style={{ fontFamily: "'Impact', 'Arial Black', sans-serif", fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 900, textAlign: 'center', color: '#fff', letterSpacing: -2, margin: '0 0 12px 0' }}>
          The minds behind the <span style={{ color: '#FFD23F' }}>machine</span>
        </h2>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: 0 }}>
          Five agents. One button. Infinite questionable decisions.
        </p>
      </div>

      {/* Cork board area */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #2A1F14 0%, #1E1610 50%, #2A1F14 100%)',
        borderRadius: 12,
        padding: '48px 24px 48px',
        border: '2px solid #3D2E1E',
        boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Cork texture noise */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 30%, #3D2E1E 1px, transparent 1px),
            radial-gradient(circle at 60% 70%, #3D2E1E 1px, transparent 1px),
            radial-gradient(circle at 80% 20%, #352818 1px, transparent 1px),
            radial-gradient(circle at 40% 80%, #352818 1px, transparent 1px)`,
          backgroundSize: '40px 40px, 60px 60px, 50px 50px, 45px 45px',
          opacity: 0.4,
        }} />

        {/* String / yarn connecting pins */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.15 }}>
          <line x1="18%" y1="8%" x2="38%" y2="6%" stroke="#FF3860" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="38%" y1="6%" x2="58%" y2="10%" stroke="#FF3860" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="58%" y1="10%" x2="78%" y2="5%" stroke="#FF3860" strokeWidth="1" strokeDasharray="4,4" />
        </svg>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
          gap: 20,
          position: 'relative',
          maxWidth: 860,
          margin: '0 auto',
        }}>
          {CREW.map((m, i) => {
            const p = pins[i]
            const isOpen = openCard === i
            return (
              <div
                key={m.name}
                onClick={() => setOpenCard(isOpen ? null : i)}
                style={{
                  position: 'relative',
                  transform: isOpen ? 'rotate(0deg) translateY(-16px) scale(1.06)' : `rotate(${p.rot}deg)`,
                  transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'pointer',
                  zIndex: isOpen ? 10 : 1,
                  animation: `slideUp 0.5s ease ${i * 0.1}s both`,
                }}
              >
                {/* Push pin */}
                <div style={{
                  position: 'absolute',
                  top: -6,
                  left: p.pinX,
                  transform: 'translateX(-50%)',
                  zIndex: 5,
                  width: 16, height: 16,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 40% 35%, #FF6060, #CC2020)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
                }} />

                {/* Card body */}
                <div style={{
                  background: '#E8DCC8',
                  borderRadius: 2,
                  padding: '20px 14px 16px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isOpen
                    ? '0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.1)'
                    : '4px 4px 12px rgba(0,0,0,0.4)',
                  transition: 'box-shadow 0.35s ease',
                }}>
                  {/* Aged paper texture */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 30%, rgba(0,0,0,0.04) 100%)',
                  }} />
                  {/* Coffee stain (subtle) */}
                  <div style={{
                    position: 'absolute',
                    right: -10, bottom: -10,
                    width: 50, height: 50,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,90,43,0.08) 40%, transparent 70%)',
                  }} />

                  {/* File number */}
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    color: '#8B7355',
                    letterSpacing: 3,
                    marginBottom: 10,
                    position: 'relative',
                  }}>
                    FILE #{String(i + 1).padStart(3, '0')}-SS
                  </div>

                  {/* Photo with halftone effect */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    marginBottom: 12,
                    border: '1px solid #C4B49A',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.img}
                      alt={m.name}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        filter: isOpen ? 'contrast(1.1) saturate(0.85)' : 'contrast(1.1) saturate(0.7)',
                        transition: 'filter 0.3s ease',
                      }}
                    />
                    {/* Halftone dot overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)',
                      backgroundSize: '3px 3px',
                      mixBlendMode: 'multiply',
                    }} />
                    {/* Aged photo overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(135deg, rgba(200,180,140,0.12) 0%, transparent 60%)',
                    }} />
                  </div>

                  {/* Name */}
                  <div style={{
                    fontFamily: "'Impact', 'Arial Black', sans-serif",
                    fontSize: 20,
                    color: '#1A1410',
                    letterSpacing: -0.5,
                    marginBottom: 2,
                    position: 'relative',
                  }}>
                    {m.name.toUpperCase()}
                  </div>

                  {/* Role */}
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    color: m.accent,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                    position: 'relative',
                  }}>
                    {m.role}
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: '#C4B49A', marginBottom: 10 }} />

                  {/* Redacted text (always visible) */}
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 8,
                    color: '#8B7355',
                    lineHeight: 1.8,
                    position: 'relative',
                    marginBottom: isOpen ? 10 : 12,
                  }}>
                    {p.redacted}
                  </div>

                  {/* Expanded bio section */}
                  <div style={{
                    maxHeight: isOpen ? 200 : 0,
                    opacity: isOpen ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}>
                    <div style={{ height: 1, background: '#C4B49A', marginBottom: 10 }} />
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 9,
                      color: '#5A4A38',
                      lineHeight: 1.7,
                      position: 'relative',
                      marginBottom: 12,
                    }}>
                      {m.bio}
                    </div>
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 8,
                      color: '#AA8866',
                      letterSpacing: 1,
                      textAlign: 'right',
                    }}>
                      STATUS: ACTIVE
                    </div>
                  </div>

                  {/* Tap hint */}
                  {!isOpen && (
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 7,
                      color: '#AA9977',
                      letterSpacing: 2,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      position: 'relative',
                      marginTop: 2,
                    }}>
                      Tap to declassify
                    </div>
                  )}

                  {/* Stamp */}
                  <div style={{
                    position: 'absolute',
                    bottom: isOpen ? 'auto' : 16,
                    top: isOpen ? 20 : 'auto',
                    right: 10,
                    transform: 'rotate(-12deg)',
                    fontFamily: "'Impact', 'Arial Black', sans-serif",
                    fontSize: 9,
                    color: isOpen ? '#1A8B30' : '#CC2020',
                    letterSpacing: 2,
                    padding: '3px 8px',
                    border: `2px solid ${isOpen ? '#1A8B30' : '#CC2020'}`,
                    borderRadius: 3,
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    transition: 'all 0.3s ease',
                    pointerEvents: 'none',
                  }}>
                    {isOpen ? 'DECLASSIFIED' : p.stamp}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 40 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
          POWERED BY CAFFEINE AND QUESTIONABLE DECISIONS
        </div>
      </div>
    </div>
  )
}

export default function ShipShotPage() {
  const [dispensing, setDispensing] = useState(false)
  const [dispensedApp, setDispensedApp] = useState<typeof APPS[0] | null>(null)
  const [showCards, setShowCards] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)

  const handleDispense = () => {
    if (dispensing) return
    setDispensing(true)
    setDispensedApp(null)

    setTimeout(() => {
      setDispensedApp(APPS[0])
      setDispensing(false)
    }, 1200)

    setTimeout(() => {
      setShowCards(true)
      setTimeout(() => {
        cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }, 2000)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0D1117' }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Grid background */}
      <div style={{ position: 'fixed', inset: 0, background: '#0D1117', backgroundImage: 'linear-gradient(rgba(30,41,54,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,54,0.7) 1px, transparent 1px)', backgroundSize: '36px 36px', zIndex: 0 }} />

      <FloatingTokens />

      {/* Corner marks */}
      {[
        { top: 16, left: 16, vSide: 'left', hSide: 'top' },
        { top: 16, right: 16, vSide: 'right', hSide: 'top' },
        { bottom: 16, left: 16, vSide: 'left', hSide: 'bottom' },
        { bottom: 16, right: 16, vSide: 'right', hSide: 'bottom' },
      ].map((pos, i) => (
        <div key={i} style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right, width: 24, height: 24, zIndex: 3 }}>
          <div style={{ position: 'absolute', left: pos.vSide === 'left' ? 0 : undefined, right: pos.vSide === 'right' ? 0 : undefined, top: 0, width: 2, height: 20, background: '#0066FF', opacity: 0.25, borderRadius: 1 }} />
          <div style={{ position: 'absolute', left: pos.vSide === 'left' ? 0 : undefined, right: pos.vSide === 'right' ? 0 : undefined, top: pos.hSide === 'top' ? 0 : undefined, bottom: pos.hSide === 'bottom' ? 0 : undefined, width: 20, height: 2, background: '#0066FF', opacity: 0.25, borderRadius: 1 }} />
        </div>
      ))}

      {/* Hero / Dispenser */}
      <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <h1 style={{ fontFamily: "'Impact', 'Arial Black', sans-serif", fontSize: 'clamp(48px, 10vw, 80px)', fontWeight: 900, letterSpacing: -3, margin: '0 0 8px 0', textAlign: 'center', color: '#fff' }}>
          <span style={{ color: 'white' }}>Ship</span>
          <span style={{ color: '#0066FF' }}>shot</span>
        </h1>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, margin: '0 0 40px 0', textAlign: 'center' }}>ONE GREAT IDEA, EVERY DAY</p>

        <VendingMachine onDispense={handleDispense} dispensing={dispensing} dispensedApp={dispensedApp} />

        <div style={{ marginTop: 32, fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', animation: dispensedApp ? 'none' : 'pulse 2s ease-in-out infinite' }}>
          {dispensedApp ? '↓ scroll to see what we\'ve shipped' : '↑ press the button'}
        </div>
      </div>

      {/* Shipped cards */}
      {showCards && (
        <div ref={cardsRef} style={{ position: 'relative', zIndex: 2, paddingTop: 60 }}>
          <DispensedCards apps={APPS} />
        </div>
      )}

      {/* THE CREW — Dossier Board */}
      <DossierBoard />

      <style>{`
        * { box-sizing: border-box; }
        @keyframes tokenFloat {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-12px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.6; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardDrop {
          from { opacity: 0; transform: translateY(-30px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0D1117; }
        ::-webkit-scrollbar-thumb { background: #003DB8; border-radius: 3px; }
      `}</style>
    </div>
  )
}
