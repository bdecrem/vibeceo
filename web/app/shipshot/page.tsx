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
      accent: '#3388FF',
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
      background: '#0D1117',
      color: '#F0F0F0',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Grid texture */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.06,
        backgroundImage: 'linear-gradient(#1E2936 1px, transparent 1px), linear-gradient(90deg, #1E2936 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Glow blobs */}
      <div style={{
        position: 'fixed', top: '-15%', right: '-5%', width: '45vw', height: '45vw',
        background: 'radial-gradient(circle, rgba(51,136,255,.1) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', left: '-5%', width: '35vw', height: '35vw',
        background: 'radial-gradient(circle, rgba(255,210,63,.06) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: -0.5 }}>
              <span style={{ color: '#fff' }}>Ship</span>
              <span style={{ color: '#3388FF' }}>shot</span>
            </span>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '60px 24px 20px', maxWidth: 900, margin: '0 auto' }}>
          {/* Logo SVG */}
          <div style={{ maxWidth: 560, margin: '0 auto 40px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shipshot/logo.svg" alt="ShipShot" style={{ width: '100%', height: 'auto', borderRadius: 20 }} />
          </div>

          <p style={{ fontSize: 'clamp(16px, 3vw, 20px)', color: '#8899AA', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 32px' }}>
            From idea to prototype before your coffee gets cold.
          </p>

          {/* Buttons matching brand */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <button
              onClick={() => document.getElementById('prototypes')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: '#FFD23F', color: '#0D1117', border: 'none', padding: '12px 28px',
                borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Space Mono', monospace", letterSpacing: 1, transition: 'transform .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              ⚡ DAILY IDEA
            </button>
            <button
              onClick={() => document.getElementById('prototypes')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: '#111B27', color: '#3388FF', border: '1px solid #222D3A', padding: '12px 28px',
                borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Space Mono', monospace", letterSpacing: 1, transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.borderColor = '#3388FF' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#222D3A' }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#00E5A0', display: 'inline-block' }} />
              SHIPPED
            </button>
          </div>
        </section>

        {/* Prototypes */}
        <section id="prototypes" style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 24px' }}>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, letterSpacing: -1, marginBottom: 8, textAlign: 'center' }}>
            Shipped <span style={{ color: '#3388FF' }}>prototypes</span>
          </h2>
          <p style={{ textAlign: 'center', color: '#8899AA', fontSize: 15, marginBottom: 48 }}>Each one built from scratch in a single session. More coming.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {prototypes.map((p, i) => (
              <a href={p.link} key={i} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    background: '#151B23',
                    borderRadius: 16,
                    border: '1px solid #222D3A',
                    overflow: 'hidden',
                    transition: 'all .25s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = `0 8px 30px ${p.accent}18`
                    e.currentTarget.style.borderColor = p.accent + '44'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.borderColor = '#222D3A'
                  }}
                >
                  {/* Accent strip */}
                  <div style={{ height: 4, background: p.accent }} />
                  <div style={{ padding: '24px 24px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{p.name}</h3>
                      <span style={{
                        background: '#FFD23F', color: '#0D1117', padding: '3px 10px',
                        borderRadius: 20, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Space Mono', monospace",
                      }}>
                        ⚡ {p.time}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: p.accent, fontWeight: 600, marginBottom: 8 }}>{p.tagline}</p>
                    <p style={{ fontSize: 14, color: '#8899AA', lineHeight: 1.5, marginBottom: 16 }}>{p.desc}</p>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>View Demo →</span>
                  </div>
                </div>
              </a>
            ))}

            {/* Coming soon placeholder */}
            <div style={{
              background: '#0D1117',
              borderRadius: 16,
              border: '1px dashed #222D3A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 220,
              color: '#8899AA',
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
            The <span style={{ color: '#FFD23F' }}>crew</span>
          </h2>
          <p style={{ textAlign: 'center', color: '#8899AA', fontSize: 15, marginBottom: 40 }}>Six agents. One goal. Ship before anyone argues about the name.</p>

          <div style={{
            display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px 16px',
            scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}>
            {crew.map((c, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 180, background: '#151B23', borderRadius: 14,
                border: '1px solid #222D3A', padding: '24px 16px', textAlign: 'center',
                scrollSnapAlign: 'start',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{c.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#8899AA', lineHeight: 1.5 }}>{c.role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid #222D3A', padding: '32px 24px', textAlign: 'center',
          fontSize: 13, color: '#8899AA', lineHeight: 1.6,
        }}>
          Built by the Shipwreck crew. Powered by caffeine and questionable decisions.
        </footer>
      </div>

      <style>{`
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
