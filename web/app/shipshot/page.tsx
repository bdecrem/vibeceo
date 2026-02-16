'use client'

import { useState, useRef, useEffect } from 'react'

// Today's drop — dispensed by the machine
const TODAYS_DROP = {
  id: 49,
  name: 'DOOMLEARN',
  tagline: "You're going to scroll anyway.",
  color: '#B8FF57',
  icon: '🧠',
  status: 'SHIPPED',
  date: 'Feb 15',
  href: '/shipshot/doomlearn',
}

// Grid apps — 1 real prototype + 5 placeholders
const GRID_APPS = [
  { id: 48, name: 'ONBOARD', tagline: 'One line of code. Onboarding builds itself.', color: '#4F46E5', icon: '🚀', status: 'SHIPPED', date: 'Feb 15', href: '/shipshot/onboard' },
  { id: 47, name: 'QuietTab', tagline: 'A browser tab that helps you breathe between tasks', color: '#FFD23F', icon: '💨', status: 'SHIPPED', date: 'Feb 14', href: null },
  { id: 46, name: 'ForkIt', tagline: 'Remix any recipe by swapping one ingredient', color: '#FF3860', icon: '🍴', status: 'SHIPPED', date: 'Feb 13', href: null },
  { id: 45, name: 'DriftFM', tagline: 'AI radio that matches your walking speed', color: '#00E5A0', icon: '📻', status: 'SHIPPED', date: 'Feb 12', href: null },
  { id: 44, name: 'SnapDebt', tagline: 'Photograph a receipt, split it instantly with friends', color: '#A855F7', icon: '📸', status: 'SHIPPED', date: 'Feb 11', href: null },
  { id: 43, name: 'MoodBoard', tagline: 'Your daily emotion as a generated color palette', color: '#00B4D8', icon: '🎨', status: 'SHIPPED', date: 'Feb 10', href: null },
]

// Back catalog (shown when expanded)
const MORE_APPS = [
  { id: 42, name: 'ParkPing', tagline: 'Alerts you 5 minutes before your parking meter expires', color: '#FFD23F', icon: '🅿️', status: 'SHIPPED', date: 'Feb 9', href: null },
  { id: 41, name: 'TinyWin', tagline: "Log one small win per day. That's it. That's the app.", color: '#FF3860', icon: '🏆', status: 'SHIPPED', date: 'Feb 8', href: null },
  { id: 40, name: 'GhostNote', tagline: 'Leave voice notes at locations for friends to find', color: '#00E5A0', icon: '👻', status: 'SHIPPED', date: 'Feb 7', href: null },
]

const CREW = [
  { name: 'Drift', role: 'Signal Hunter', img: '/shipshot/crew/drift-bg.png', accent: '#00D4FF', bio: 'Scans the noise so you don\'t have to. Drift finds the signal in a sea of trends, memes, and market chatter — then distills it into one sharp insight before anyone else notices.' },
  { name: 'Hype', role: 'Vibes Architect', img: '/shipshot/crew/hype-bg.png', accent: '#FF3366', bio: 'Turns a whisper into a roar. Hype crafts the narrative, writes the copy, and makes sure every launch feels like an event — even if it\'s a to-do list app.' },
  { name: 'Margin', role: 'Numbers Oracle', img: '/shipshot/crew/margin-bg.png', accent: '#10B981', bio: 'The spreadsheet whisperer. Margin runs the models, stress-tests the unit economics, and tells you the hard truth about whether your idea can actually make money.' },
  { name: 'Pixel', role: 'Design Alchemist', img: '/shipshot/crew/pixel-bg.png', accent: '#7C3AED', bio: 'Makes it beautiful or makes it weird — ideally both. Pixel handles UI, brand, and all the visual decisions that turn a prototype into something people screenshot.' },
  { name: 'Ship', role: 'Build Machine', img: '/shipshot/crew/ship-bg.png', accent: '#0066FF', bio: 'Writes the code, wires the API, deploys to prod. Ship doesn\'t debate architecture — Ship builds the thing and fixes it live. Velocity over perfection.' },
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

function VendingMachine({ onDispense, dispensing, dropped }: {
  onDispense: () => void
  dispensing: boolean
  dropped: boolean
}) {
  return (
    <div style={{ position: 'relative', width: 320, margin: '0 auto' }}>
      {/* Badge */}
      <div style={{ position: 'absolute', top: -12, right: -16, background: dropped ? '#00E5A0' : '#FFD23F', color: '#0D1117', fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 12, letterSpacing: 2, padding: '6px 14px', borderRadius: 8, zIndex: 5, transition: 'background 0.3s ease' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'rgba(255,255,255,0.15)', borderRadius: '8px 8px 0 0' }} />
        <span style={{ position: 'relative' }}>{dropped ? 'DROPPED' : 'NEW'}</span>
      </div>

      {/* Machine body */}
      <div style={{ background: '#0066FF', borderRadius: 28, padding: 14, position: 'relative', boxShadow: '12px 12px 0 rgba(0,0,0,0.3)' }}>
        <div style={{ background: '#003DB8', borderRadius: 20, padding: 16 }}>
          {/* Screen — always shows today's app */}
          <div style={{ background: '#0D1117', borderRadius: 14, padding: 20, minHeight: 180, position: 'relative', overflow: 'hidden' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${20 + i * 20}%`, height: 1, background: 'rgba(0,102,255,0.08)' }} />
            ))}

            <div style={{ display: 'inline-block', background: '#FFD23F', color: '#0D1117', fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11, letterSpacing: 3, padding: '5px 12px', borderRadius: 6, marginBottom: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'rgba(255,255,255,0.15)', borderRadius: '6px 6px 0 0' }} />
              <span style={{ position: 'relative' }}>TODAY</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 8 }}>
              <div style={{ textAlign: 'center', opacity: dropped ? 0.35 : 1, transition: 'opacity 0.4s ease' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{TODAYS_DROP.icon}</div>
                <div style={{ color: TODAYS_DROP.color, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>{TODAYS_DROP.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Space Mono', monospace", fontSize: 11, marginTop: 6, maxWidth: 200, lineHeight: 1.4 }}>{TODAYS_DROP.tagline}</div>
                {dropped && (
                  <div style={{ marginTop: 10, fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#00E5A0', letterSpacing: 2 }}>DISPENSED &#x2193;</div>
                )}
              </div>
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
              disabled={dispensing || dropped}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: dropped ? '#334455' : dispensing ? '#992240' : '#FF3860',
                border: 'none',
                cursor: dropped ? 'default' : dispensing ? 'not-allowed' : 'pointer',
                position: 'relative',
                boxShadow: dropped ? 'none' : dispensing ? 'none' : '0 4px 0 #AA1530, 0 6px 20px rgba(255,56,96,0.4)',
                transform: (dispensing || dropped) ? 'translateY(3px)' : 'none',
                transition: 'all 0.15s ease', flexShrink: 0,
              }}
            >
              <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: dropped ? 'radial-gradient(circle at 40% 35%, #445566, #334455)' : dispensing ? 'radial-gradient(circle at 40% 35%, #BB3355, #881530)' : 'radial-gradient(circle at 40% 35%, #FF6080, #FF3860)' }} />
              <span style={{ position: 'relative', color: 'white', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {dropped ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : dispensing ? (
                  <span style={{ fontSize: 24, fontWeight: 'bold' }}>...</span>
                ) : (
                  <svg width="22" height="24" viewBox="0 0 22 24" fill="white"><polygon points="4,2 20,12 4,22" /></svg>
                )}
              </span>
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

type AppType = { id: number; name: string; tagline: string; color: string; icon: string; status: string; date: string; href: string | null }

function AppCard({ app, index, isNew }: { app: AppType; index: number; isNew?: boolean }) {
  const rotations = [-3, 5, -7, 4, -5, 8]
  const rot = rotations[index % rotations.length]
  const isPlayable = !!app.href

  const card = (
    <div
      style={{
        background: app.color, borderRadius: 16, padding: 20,
        position: 'relative', overflow: 'hidden',
        transform: `rotate(${rot}deg)`,
        boxShadow: isNew ? `8px 8px 0 rgba(0,0,0,0.25), 0 0 30px ${app.color}44` : '8px 8px 0 rgba(0,0,0,0.25)',
        transition: 'transform 0.3s ease',
        cursor: isPlayable ? 'pointer' : 'default',
        animation: isNew ? 'cardDrop 0.6s ease-out both' : `cardDrop 0.6s ease-out ${index * 0.08}s both`,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'inline-block', background: '#0D1117', borderRadius: 6, padding: '4px 10px', fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700, color: app.color, letterSpacing: 2 }}>
            {isPlayable ? '▶ PLAY' : `● ${app.status}`}
          </div>
          {isNew && (
            <div style={{ background: '#0D1117', borderRadius: 6, padding: '4px 8px', fontFamily: "'Space Mono', monospace", fontSize: 8, fontWeight: 700, color: '#FFD23F', letterSpacing: 2 }}>
              NEW
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (isPlayable) {
    return <a href={app.href!} style={{ textDecoration: 'none' }}>{card}</a>
  }
  return card
}

function CharacterSelect() {
  const [selected, setSelected] = useState<number | null>(null)
  const member = selected !== null ? CREW[selected] : null

  return (
    <div style={{ position: 'relative', zIndex: 2, padding: '80px 20px 60px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Impact', 'Arial Black', sans-serif", fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 900, textAlign: 'center', color: '#fff', letterSpacing: -2, margin: 0 }}>
          Meet the <span style={{ color: '#FFD23F' }}>crew</span>
        </h2>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, maxWidth: 700, margin: '0 auto', padding: '0 8px' }}>
        {CREW.map((m, i) => {
          const isSelected = selected === i
          return (
            <div
              key={m.name}
              onClick={() => setSelected(isSelected ? null : i)}
              style={{
                flex: isSelected ? '1 1 220px' : '1 1 100px',
                maxWidth: isSelected ? 220 : 140,
                height: isSelected ? 320 : 260,
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                border: isSelected ? `2px solid ${m.accent}` : '2px solid #1E293600',
                boxShadow: isSelected ? `0 0 40px ${m.accent}44, 0 0 80px ${m.accent}18` : 'none',
                filter: selected !== null && !isSelected ? 'brightness(0.35)' : 'brightness(1)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.img} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', transition: 'all 0.4s ease' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 70%)', padding: '40px 12px 14px' }}>
                <div style={{ fontFamily: "'Impact', 'Arial Black', sans-serif", fontSize: isSelected ? 22 : 15, color: '#fff', letterSpacing: -0.5, transition: 'font-size 0.3s ease', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {m.name}
                </div>
                {isSelected && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: m.accent, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4, animation: 'slideUp 0.3s ease' }}>
                    {m.role}
                  </div>
                )}
              </div>
              {isSelected && (
                <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ background: m.accent, color: '#000', fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: 3, padding: '4px 12px', borderRadius: 4, animation: 'slideUp 0.2s ease' }}>SELECTED</div>
                </div>
              )}
              {isSelected && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: m.accent, boxShadow: `0 0 12px ${m.accent}` }} />
              )}
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, minHeight: 40 }}>
        {member ? (
          <div style={{ animation: 'slideUp 0.3s ease' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: member.accent }}>{member.name}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '0 10px' }}>//</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{member.role}</span>
          </div>
        ) : (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, animation: 'pulse 2s ease-in-out infinite' }}>TAP TO SELECT</div>
        )}
      </div>

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
  const [dropped, setDropped] = useState(false)
  const [showExpanded, setShowExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const droppedCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleDispense = () => {
    if (dispensing || dropped) return
    setDispensing(true)

    setTimeout(() => {
      setDropped(true)
      setDispensing(false)
      setTimeout(() => {
        droppedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 400)
    }, 1200)
  }

  const totalShipped = GRID_APPS.length + MORE_APPS.length + (dropped ? 1 : 0)
  const visibleCount = isMobile ? (dropped ? 1 : 2) : (dropped ? 5 : 6)
  const hiddenGridApps = GRID_APPS.length - visibleCount
  const hiddenTotal = hiddenGridApps + MORE_APPS.length

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
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px 60px' }}>
        <h1 style={{ fontFamily: "'Impact', 'Arial Black', sans-serif", fontSize: 'clamp(48px, 10vw, 80px)', fontWeight: 900, letterSpacing: -3, margin: '0 0 8px 0', textAlign: 'center', color: '#fff' }}>
          <span style={{ color: 'white' }}>Ship</span>
          <span style={{ color: '#0066FF' }}>shot</span>
        </h1>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, margin: '0 0 40px 0', textAlign: 'center' }}>ONE GREAT IDEA, EVERY DAY</p>

        <VendingMachine onDispense={handleDispense} dispensing={dispensing} dropped={dropped} />

        <div style={{ marginTop: 32, fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', animation: dropped ? 'none' : 'pulse 2s ease-in-out infinite' }}>
          {dropped ? '↓ scroll to see what we\'ve shipped' : '↑ dispense today\'s drop'}
        </div>
      </div>

      {/* Shipped cards grid — always visible */}
      <div style={{ position: 'relative', zIndex: 2, padding: '40px 20px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700, color: 'white', margin: 0, letterSpacing: -1 }}>
            What we&apos;ve <span style={{ color: '#0066FF' }}>shipped</span>
          </h2>
          <div style={{ width: 60, height: 3, background: '#0066FF', margin: '16px auto 0', borderRadius: 2 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 24, maxWidth: 800, margin: '0 auto' }}>
          {/* Today's drop — appears at top of grid when dispensed */}
          {dropped && (
            <div ref={droppedCardRef}>
              <AppCard app={TODAYS_DROP} index={0} isNew />
            </div>
          )}

          {/* Grid apps — 2 on mobile, 6 on desktop */}
          {GRID_APPS.slice(0, visibleCount).map((app, i) => (
            <AppCard key={app.id} app={app} index={dropped ? i + 1 : i} />
          ))}

          {/* Expanded: remaining grid apps + back catalog */}
          {showExpanded && (
            <>
              {GRID_APPS.slice(visibleCount).map((app, i) => (
                <AppCard key={app.id} app={app} index={visibleCount + i + 1} />
              ))}
              {MORE_APPS.map((app, i) => (
                <AppCard key={app.id} app={app} index={GRID_APPS.length + i + 1} />
              ))}
            </>
          )}
        </div>

        {/* Expand / stats footer */}
        <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 60 }}>
          <div style={{ display: 'inline-flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ background: '#FFD23F', borderRadius: 8, padding: '8px 16px', fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: '#0D1117', letterSpacing: 2, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <span style={{ position: 'relative' }}>&#x26A1; {totalShipped} IDEAS SHIPPED</span>
            </div>
            {!showExpanded && hiddenTotal > 0 && (
              <button
                onClick={() => setShowExpanded(true)}
                style={{
                  background: 'rgba(0,102,255,0.12)',
                  border: '1px solid rgba(0,102,255,0.3)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#3388FF',
                  letterSpacing: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                VIEW {hiddenTotal} MORE &#x2192;
              </button>
            )}
            {showExpanded && (
              <div style={{ background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.2)', borderRadius: 8, padding: '8px 16px', fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: '#3388FF', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5A0' }} />
                MORE TOMORROW
              </div>
            )}
          </div>
        </div>
      </div>

      {/* THE CREW */}
      <CharacterSelect />

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
