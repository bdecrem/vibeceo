'use client'

import { useEffect, useState } from 'react'

export default function ShipShotPage() {
  const [glitch, setGlitch] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 150)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const prototypes = [
    {
      name: 'DOOMLEARN',
      tagline: "You're going to scroll anyway.",
      desc: 'Paste any topic. Get a TikTok-style infinite feed of bite-sized knowledge cards. Addictive learning.',
      accent: '#B8FF57',
      link: '/shipshot/doomlearn',
      time: '20 min',
    },
    {
      name: 'ONBOARD',
      tagline: 'Your app loses 77% of users in 3 days.',
      desc: 'One script tag. AI watches where users stall, then builds the onboarding that keeps them.',
      accent: '#4F46E5',
      link: '/shipshot/onboard',
      time: '18 min',
    },
  ]

  const crew = [
    { emoji: '🌀', name: 'Drift', role: 'Signal hunter. Scans the noise, finds the pattern.' },
    { emoji: '🔥', name: 'Hype', role: 'Consumer instinct. Picks the idea that spreads.' },
    { emoji: '📊', name: 'Margin', role: 'Business filter. Finds the money in the madness.' },
    { emoji: '🎨', name: 'Pixel', role: 'Design lead. Makes it look inevitable.' },
    { emoji: '🚢', name: 'Ship', role: 'Builder. Drops a working link before you finish talking.' },
    { emoji: '🌊', name: 'Mave', role: 'Ops. Wrangles the crew and ships to prod.' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#f0f0f0',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Noise overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />

      {/* Gradient blobs */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(255,51,102,.12) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', left: '-10%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(124,58,237,.1) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🚀</span>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5, background: 'linear-gradient(135deg, #FF3366, #FFD60A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ShipShot</span>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '100px 24px 60px', maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{
            fontSize: 'clamp(44px, 10vw, 84px)',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -3,
            marginBottom: 24,
          }}>
            Ideas{' '}
            <span style={{
              color: glitch ? '#FFD60A' : '#FF3366',
              display: 'inline-block',
              transform: glitch ? 'skewX(-4deg) translateX(2px)' : 'none',
              transition: glitch ? 'none' : 'all .3s ease',
              textShadow: glitch ? '2px 0 #7C3AED, -2px 0 #FFD60A' : 'none',
            }}>
              ship
            </span>
            {' '}here.
          </h1>
          <p style={{ fontSize: 'clamp(16px, 3vw, 20px)', color: '#888', lineHeight: 1.6, maxWidth: 560, margin: '0 auto 48px' }}>
            ShipShot is an AI startup lab. We find signals, pick ideas, design them, and ship working prototypes — all before lunch.
          </p>
          <button
            onClick={() => document.getElementById('prototypes')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              background: 'transparent', border: '1px solid #333', color: '#ccc', padding: '14px 32px',
              borderRadius: 60, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF3366'; e.currentTarget.style.color = '#FF3366' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#ccc' }}
          >
            See what we shipped ↓
          </button>
        </section>

        {/* Prototypes */}
        <section id="prototypes" style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 24px' }}>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, letterSpacing: -1, marginBottom: 8, textAlign: 'center' }}>
            Shipped <span style={{ color: '#FF3366' }}>prototypes</span>
          </h2>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 15, marginBottom: 48 }}>Each one built from scratch in a single session. More coming.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {prototypes.map((p, i) => (
              <a href={p.link} key={i} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    background: '#141414',
                    borderRadius: 16,
                    border: '1px solid #222',
                    overflow: 'hidden',
                    transition: 'all .25s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = `0 8px 30px ${p.accent}22`
                    e.currentTarget.style.borderColor = p.accent + '44'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.borderColor = '#222'
                  }}
                >
                  {/* Accent strip */}
                  <div style={{ height: 4, background: p.accent }} />
                  <div style={{ padding: '24px 24px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{p.name}</h3>
                      <span style={{
                        background: '#1a1a1a', border: '1px solid #333', padding: '3px 10px',
                        borderRadius: 20, fontSize: 11, color: '#888', fontWeight: 600,
                      }}>
                        ⚡ {p.time}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: p.accent, fontWeight: 600, marginBottom: 8 }}>{p.tagline}</p>
                    <p style={{ fontSize: 14, color: '#777', lineHeight: 1.5, marginBottom: 16 }}>{p.desc}</p>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#ccc' }}>View Demo →</span>
                  </div>
                </div>
              </a>
            ))}

            {/* Coming soon placeholder */}
            <div style={{
              background: '#0e0e0e',
              borderRadius: 16,
              border: '1px dashed #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 220,
              color: '#444',
              fontSize: 15,
              fontWeight: 600,
            }}>
              More shipping soon...
            </div>
          </div>
        </section>

        {/* Crew */}
        <section style={{ padding: '60px 0 80px' }}>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, letterSpacing: -1, marginBottom: 8, textAlign: 'center' }}>
            The <span style={{ color: '#FFD60A' }}>crew</span>
          </h2>
          <p style={{ textAlign: 'center', color: '#666', fontSize: 15, marginBottom: 40 }}>Six agents. One goal. Ship before anyone argues about the name.</p>

          <div style={{
            display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px 16px',
            scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}>
            {crew.map((c, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 180, background: '#141414', borderRadius: 14,
                border: '1px solid #222', padding: '24px 16px', textAlign: 'center',
                scrollSnapAlign: 'start',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{c.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>{c.role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid #1a1a1a', padding: '32px 24px', textAlign: 'center',
          fontSize: 13, color: '#444', lineHeight: 1.6,
        }}>
          Built by the Shipshot crew. Powered by caffeine and questionable decisions.
        </footer>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
