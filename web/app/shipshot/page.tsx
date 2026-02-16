'use client'

import { useEffect, useState } from 'react'

const prototypes = [
  {
    name: 'DOOMLEARN',
    tagline: "You're going to scroll anyway.",
    description: 'Paste any article or PDF. Get an infinite scroll feed of bite-sized knowledge cards you can\'t stop swiping.',
    href: '/shipshot/doomlearn',
    accent: '#B8FF57',
    shipped: '20 min',
  },
  {
    name: 'ONBOARD',
    tagline: 'One line of code. Onboarding builds itself.',
    description: 'Drop a script tag. AI watches where users stall and automatically deploys the nudges that keep them.',
    href: '/shipshot/onboard',
    accent: '#4F46E5',
    shipped: '25 min',
  },
]

const crew = [
  { emoji: '🌀', name: 'Drift', role: 'Signal hunter. Always online.' },
  { emoji: '🔥', name: 'Hype', role: 'Vibes. Distribution instinct.' },
  { emoji: '📊', name: 'Margin', role: 'Unit economics. The adult.' },
  { emoji: '🎨', name: 'Pixel', role: 'Design. Makes it inevitable.' },
  { emoji: '🚢', name: 'Ship', role: 'Builds it. Fast.' },
  { emoji: '🌊', name: 'Mave', role: 'Ops. Wrangles the crew.' },
]

export default function ShipShotLanding() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1117',
      color: '#F0F0F0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid texture */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(51, 136, 255, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(51, 136, 255, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Floating gem accents */}
      <div style={{
        position: 'fixed',
        top: '15%',
        right: '8%',
        width: 12,
        height: 12,
        background: '#FF4081',
        transform: 'rotate(45deg)',
        opacity: 0.6,
        zIndex: 1,
        animation: mounted ? 'float1 6s ease-in-out infinite' : undefined,
      }} />
      <div style={{
        position: 'fixed',
        top: '45%',
        left: '5%',
        width: 10,
        height: 10,
        background: '#7C4DFF',
        transform: 'rotate(45deg)',
        opacity: 0.5,
        zIndex: 1,
        animation: mounted ? 'float2 7s ease-in-out infinite' : undefined,
      }} />
      <div style={{
        position: 'fixed',
        bottom: '25%',
        right: '12%',
        width: 8,
        height: 8,
        background: '#00C9A7',
        transform: 'rotate(45deg)',
        opacity: 0.5,
        zIndex: 1,
        animation: mounted ? 'float1 5s ease-in-out infinite' : undefined,
      }} />

      {/* Hero */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Logo / Brand Image */}
        <img
          src="/shipshot/logo.svg"
          alt="ShipShot"
          style={{
            width: '100%',
            maxWidth: 600,
            height: 'auto',
            marginBottom: 32,
          }}
        />

        <p style={{
          fontSize: 'clamp(16px, 3vw, 22px)',
          color: '#8899AA',
          maxWidth: 500,
          lineHeight: 1.6,
          marginBottom: 16,
        }}>
          From idea to prototype before your coffee gets cold.
        </p>

        <p style={{
          fontSize: 'clamp(14px, 2.5vw, 17px)',
          color: '#556677',
          maxWidth: 480,
          lineHeight: 1.6,
          marginBottom: 48,
        }}>
          An AI crew that finds signals, picks ideas, designs them, and ships working prototypes — all before lunch.
        </p>

        {/* Pill buttons like the brand */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 48,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <span style={{
            background: '#FFD23F',
            color: '#0D1117',
            padding: '10px 22px',
            borderRadius: 24,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            ⚡ Daily Idea
          </span>
          <span style={{
            background: '#1A2A3A',
            color: '#00C9A7',
            padding: '10px 22px',
            borderRadius: 24,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 1,
            textTransform: 'uppercase',
            border: '1px solid #00C9A722',
          }}>
            ● Shipped
          </span>
        </div>

        <a
          href="#shipped"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('shipped')?.scrollIntoView({ behavior: 'smooth' })
          }}
          style={{
            color: '#3388FF',
            fontSize: 13,
            letterSpacing: 3,
            textTransform: 'uppercase',
            textDecoration: 'none',
            cursor: 'pointer',
            animation: mounted ? 'bob 1.5s ease-in-out infinite' : undefined,
          }}
        >
          See what we shipped ↓
        </a>
      </section>

      {/* Prototypes Gallery */}
      <section id="shipped" style={{
        padding: '80px 24px',
        maxWidth: 900,
        margin: '0 auto',
        position: 'relative',
        zIndex: 2,
      }}>
        <h2 style={{
          fontSize: 13,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: '#556677',
          marginBottom: 40,
          textAlign: 'center',
        }}>
          Shipped Prototypes
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 20,
        }}>
          {prototypes.map((p) => (
            <a
              key={p.name}
              href={p.href}
              style={{
                background: '#151D27',
                padding: 0,
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: '1px solid #1E2936',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 8px 30px ${p.accent}18`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ height: 3, background: p.accent }} />

              <div style={{ padding: '28px 24px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}>
                  <h3 style={{
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}>
                    {p.name}
                  </h3>
                  <span style={{
                    fontSize: 11,
                    color: '#FFD23F',
                    background: '#1A2A1A',
                    padding: '4px 10px',
                    whiteSpace: 'nowrap',
                    borderRadius: 12,
                  }}>
                    ⚡ {p.shipped}
                  </span>
                </div>

                <p style={{
                  fontSize: 13,
                  color: p.accent,
                  fontWeight: 600,
                  marginBottom: 12,
                }}>
                  {p.tagline}
                </p>

                <p style={{
                  fontSize: 14,
                  color: '#8899AA',
                  lineHeight: 1.5,
                  marginBottom: 20,
                }}>
                  {p.description}
                </p>

                <span style={{
                  fontSize: 13,
                  color: '#3388FF',
                  fontWeight: 600,
                }}>
                  View Demo →
                </span>
              </div>
            </a>
          ))}

          {/* Coming soon */}
          <div style={{
            border: '1px dashed #1E2936',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            minHeight: 200,
          }}>
            <span style={{ color: '#334455', fontSize: 14 }}>More shipping soon...</span>
          </div>
        </div>
      </section>

      {/* Crew */}
      <section style={{
        padding: '60px 24px 40px',
        maxWidth: 900,
        margin: '0 auto',
        position: 'relative',
        zIndex: 2,
      }}>
        <h2 style={{
          fontSize: 13,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: '#556677',
          marginBottom: 32,
          textAlign: 'center',
        }}>
          The Crew
        </h2>

        <div style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingBottom: 16,
          WebkitOverflowScrolling: 'touch',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {crew.map((c) => (
            <div
              key={c.name}
              style={{
                flex: '0 0 auto',
                width: 130,
                background: '#151D27',
                border: '1px solid #1E2936',
                padding: '22px 14px',
                textAlign: 'center',
                scrollSnapAlign: 'start',
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 10 }}>{c.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: '#8899AA', lineHeight: 1.4 }}>{c.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 24px 60px',
        position: 'relative',
        zIndex: 2,
      }}>
        <p style={{ fontSize: 13, color: '#334455' }}>
          Built by the ShipShot crew. Powered by caffeine and questionable decisions.
        </p>
      </footer>

      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        @keyframes float1 {
          0%, 100% { transform: rotate(45deg) translateY(0); }
          50% { transform: rotate(45deg) translateY(-12px); }
        }
        @keyframes float2 {
          0%, 100% { transform: rotate(45deg) translateY(0); }
          50% { transform: rotate(45deg) translateY(10px); }
        }
      `}</style>
    </div>
  )
}
