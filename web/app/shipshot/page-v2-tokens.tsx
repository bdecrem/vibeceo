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
  { name: 'Drift', role: 'Signal Hunter', img: '/shipshot/crew/drift-bg.png', accent: '#00D4FF' },
  { name: 'Hype', role: 'Vibes Architect', img: '/shipshot/crew/hype-bg.png', accent: '#FF3366' },
  { name: 'Margin', role: 'Numbers Oracle', img: '/shipshot/crew/margin-bg.png', accent: '#10B981' },
  { name: 'Pixel', role: 'Design Alchemist', img: '/shipshot/crew/pixel-bg.png', accent: '#7C3AED' },
  { name: 'Ship', role: 'Build Machine', img: '/shipshot/crew/ship-bg.png', accent: '#0066FF' },
]

function DispensedTokens() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set())
  const scatter = [
    { x: '10%', y: 20, rot: -18, delay: 0 },
    { x: '52%', y: 0, rot: 8, delay: 0.15 },
    { x: '78%', y: 35, rot: -6, delay: 0.3 },
    { x: '22%', y: 110, rot: 14, delay: 0.1 },
    { x: '62%', y: 125, rot: -22, delay: 0.25 },
  ]

  const toggleFlip = (i: number) => {
    setFlipped(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  return (
    <div style={{ position: 'relative', zIndex: 2, padding: '80px 20px 60px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Impact', 'Arial Black', sans-serif", fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 900, textAlign: 'center', color: '#fff', letterSpacing: -2, margin: '0 0 12px 0' }}>
          The minds behind the <span style={{ color: '#FFD23F' }}>machine</span>
        </h2>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>
          FLIP A COIN
        </p>
      </div>

      {/* Coin scatter area */}
      <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', height: 380 }}>
        {CREW.map((m, i) => {
          const s = scatter[i]
          const isFlipped = flipped.has(i)
          const coinSize = 160

          return (
            <div
              key={m.name}
              onClick={() => toggleFlip(i)}
              style={{
                position: 'absolute',
                left: s.x,
                top: s.y,
                transform: `rotate(${s.rot}deg)`,
                cursor: 'pointer',
                perspective: 600,
                width: coinSize,
                height: coinSize,
                animation: `coinDrop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${s.delay}s both`,
              }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}>
                {/* FRONT — portrait */}
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%',
                  backfaceVisibility: 'hidden',
                  overflow: 'hidden',
                  boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 0 0 5px #2A2A3A, inset 0 0 0 7px #1A1A28`,
                }}>
                  {/* Metallic rim */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: `conic-gradient(from 0deg, #3A3A4A, #5A5A6A, #3A3A4A, #5A5A6A, #3A3A4A)`,
                    padding: 6,
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      overflow: 'hidden', position: 'relative',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.img}
                        alt={m.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {/* Shine overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)',
                        borderRadius: '50%',
                      }} />
                    </div>
                  </div>
                  {/* Edge highlight ring */}
                  <div style={{
                    position: 'absolute', inset: 1, borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.1)',
                    pointerEvents: 'none',
                  }} />
                </div>

                {/* BACK — name & role */}
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 0 0 5px #2A2A3A, inset 0 0 0 7px #1A1A28`,
                  overflow: 'hidden',
                }}>
                  {/* Metallic rim + colored interior */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: `conic-gradient(from 0deg, #3A3A4A, #5A5A6A, #3A3A4A, #5A5A6A, #3A3A4A)`,
                    padding: 6,
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: '#0D1117',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {/* Radial accent glow */}
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: `radial-gradient(circle at 50% 50%, ${m.accent}22 0%, transparent 70%)`,
                      }} />
                      <div style={{
                        fontFamily: "'Impact', 'Arial Black', sans-serif",
                        fontSize: 24,
                        color: '#fff',
                        letterSpacing: -1,
                        position: 'relative',
                        textShadow: `0 0 20px ${m.accent}66`,
                      }}>
                        {m.name}
                      </div>
                      <div style={{
                        width: 30, height: 2,
                        background: m.accent,
                        borderRadius: 1,
                        margin: '8px 0',
                        boxShadow: `0 0 8px ${m.accent}`,
                      }} />
                      <div style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 9,
                        color: m.accent,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        position: 'relative',
                      }}>
                        {m.role}
                      </div>
                    </div>
                  </div>
                  {/* Edge highlight ring */}
                  <div style={{
                    position: 'absolute', inset: 1, borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.1)',
                    pointerEvents: 'none',
                  }} />
                  {/* Shine */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
                    pointerEvents: 'none',
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 32, paddingBottom: 40 }}>
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

      {/* THE CREW — Dispensed Tokens */}
      <DispensedTokens />

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
        @keyframes coinDrop {
          0% { opacity: 0; transform: translateY(-60px) scale(0.6) rotate(0deg); }
          60% { opacity: 1; transform: translateY(8px) scale(1.05); }
          80% { transform: translateY(-4px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0D1117; }
        ::-webkit-scrollbar-thumb { background: #003DB8; border-radius: 3px; }
      `}</style>
    </div>
  )
}
