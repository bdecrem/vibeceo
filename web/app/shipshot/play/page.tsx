'use client'

import { useEffect, useState, useRef } from 'react'

const dispensed = [
  {
    name: 'DOOMLEARN',
    tagline: "You're going to scroll anyway.",
    href: '/shipshot/doomlearn',
    accent: '#B8FF57',
    rotation: -3,
    delay: 0.3,
  },
  {
    name: 'ONBOARD',
    tagline: 'One line of code. Onboarding builds itself.',
    href: '/shipshot/onboard',
    accent: '#4F46E5',
    rotation: 2,
    delay: 0.6,
  },
]

const crew = ['🌀', '🔥', '📊', '🎨', '🚢', '🌊']

const gems = [
  { color: '#FF3860', top: '8%', left: '8%', size: 14, delay: 0 },
  { color: '#A855F7', top: '18%', right: '10%', size: 12, delay: 1.2 },
  { color: '#00E5A0', top: '35%', left: '5%', size: 16, delay: 0.6 },
  { color: '#FFD23F', top: '50%', right: '7%', size: 10, delay: 1.8 },
  { color: '#FF3860', top: '65%', right: '12%', size: 12, delay: 0.4 },
  { color: '#A855F7', top: '75%', left: '10%', size: 14, delay: 1.0 },
  { color: '#00E5A0', top: '88%', right: '6%', size: 10, delay: 2.0 },
]

export default function ShipShotPlay() {
  const [mounted, setMounted] = useState(false)
  const [shaking, setShaking] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDispense = () => {
    if (cardsRef.current) {
      cardsRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleTeaser = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 600)
  }

  return (
    <>
      <style>{`
        @keyframes slideDown {
          0% { opacity: 0; transform: translateY(-80px) rotate(0deg) scale(0.8); }
          60% { opacity: 1; transform: translateY(10px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slotGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(255,210,63,0.2), inset 0 0 8px rgba(255,210,63,0.1); }
          50% { box-shadow: 0 0 24px rgba(255,210,63,0.4), inset 0 0 12px rgba(255,210,63,0.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px) rotate(-1deg); }
          40% { transform: translateX(4px) rotate(1deg); }
          60% { transform: translateX(-3px) rotate(-0.5deg); }
          80% { transform: translateX(3px) rotate(0.5deg); }
        }
        @keyframes gridScroll {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes gemFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(15deg); }
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: '#0D1117',
        color: '#F0F0F0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grid bg */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'linear-gradient(rgba(0,102,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          animation: 'gridScroll 20s linear infinite',
          pointerEvents: 'none',
        }} />

        {/* Corner brackets */}
        {[
          { top: 16, left: 16, bt: '2px solid rgba(0,102,255,0.25)', bl: '2px solid rgba(0,102,255,0.25)' },
          { top: 16, right: 16, bt: '2px solid rgba(0,102,255,0.25)', br: '2px solid rgba(0,102,255,0.25)' },
          { bottom: 16, left: 16, bb: '2px solid rgba(0,102,255,0.25)', bl: '2px solid rgba(0,102,255,0.25)' },
          { bottom: 16, right: 16, bb: '2px solid rgba(0,102,255,0.25)', br: '2px solid rgba(0,102,255,0.25)' },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'fixed', width: 28, height: 28, zIndex: 10,
            ...(b.top !== undefined && { top: b.top }),
            ...(b.bottom !== undefined && { bottom: b.bottom }),
            ...(b.left !== undefined && { left: b.left }),
            ...(b.right !== undefined && { right: b.right }),
            ...(b.bt && { borderTop: b.bt }),
            ...(b.bb && { borderBottom: b.bb }),
            ...(b.bl && { borderLeft: b.bl }),
            ...(b.br && { borderRight: b.br }),
          }} />
        ))}

        {/* Floating gems */}
        {mounted && gems.map((gem, i) => (
          <div key={i} style={{
            position: 'fixed',
            ...(gem.top ? { top: gem.top } : {}),
            ...(gem.left ? { left: gem.left } : {}),
            ...(gem.right ? { right: gem.right } : {}),
            width: gem.size,
            height: gem.size,
            backgroundColor: gem.color,
            borderRadius: 2,
            animation: `gemFloat 3s ease-in-out ${gem.delay}s infinite`,
            opacity: 0.6,
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        ))}

        {/* Main content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '60px 20px 80px',
          position: 'relative',
          zIndex: 2,
        }}>

          {/* === THE MACHINE === */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 360,
            animation: shaking ? 'shake 0.6s ease-in-out' : 'none',
          }}>
            {/* Machine top */}
            <div style={{
              width: '100%',
              height: 12,
              backgroundColor: '#3388FF',
              borderRadius: '12px 12px 0 0',
            }} />

            {/* Machine body */}
            <div style={{
              width: '100%',
              backgroundColor: '#0066FF',
              borderRadius: '0 0 16px 16px',
              padding: '24px 24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              position: 'relative',
            }}>

              {/* Screen */}
              <div style={{
                width: '100%',
                aspectRatio: '4/3',
                backgroundColor: '#0D1117',
                borderRadius: 12,
                border: '3px solid #3388FF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Scanlines */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)',
                  pointerEvents: 'none',
                }} />

                {/* Star */}
                <div style={{ fontSize: 48, lineHeight: 1 }}>⭐</div>

                {/* Wordmark */}
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
                  <span style={{ color: '#fff' }}>Ship</span>
                  <span style={{ color: '#3388FF' }}>Shot</span>
                </div>

                {/* TODAY badge */}
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: '#FFD23F',
                  color: '#0D1117',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 4,
                  letterSpacing: 1,
                }}>
                  TODAY
                </div>
              </div>

              {/* Buttons row */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FF3860', boxShadow: '0 2px 0 #c62d4c' }} />
                <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#00E5A0', boxShadow: '0 2px 0 #00b880' }} />
                <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD23F', boxShadow: '0 2px 0 #d4a820' }} />
              </div>

              {/* Dispense button */}
              <button
                onClick={handleDispense}
                style={{
                  background: 'linear-gradient(180deg, #FFD23F 0%, #E5B800 100%)',
                  color: '#0D1117',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 28px',
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  boxShadow: '0 3px 0 #B8930A',
                  transition: 'transform 0.1s',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'translateY(2px)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                ⚡ DISPENSE
              </button>

              {/* Slot */}
              <div style={{
                width: '70%',
                height: 20,
                backgroundColor: '#0D1117',
                borderRadius: 4,
                border: '1px solid #3388FF',
                animation: 'slotGlow 2s ease-in-out infinite',
              }} />
            </div>

            {/* Machine legs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '80%' }}>
              <div style={{ width: 16, height: 12, backgroundColor: '#004ACC', borderRadius: '0 0 4px 4px' }} />
              <div style={{ width: 16, height: 12, backgroundColor: '#004ACC', borderRadius: '0 0 4px 4px' }} />
            </div>
          </div>

          {/* === DISPENSED CARDS === */}
          <div ref={cardsRef} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            marginTop: 48,
            width: '100%',
            maxWidth: 400,
          }}>
            {/* Conveyor label */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
            }}>
              <div style={{ flex: 1, height: 1, borderTop: '2px dashed rgba(0,102,255,0.3)' }} />
              <span style={{ fontSize: 11, color: '#8899AA', letterSpacing: 2, fontWeight: 600 }}>
                {dispensed.length} DISPENSED · ∞ LOADING...
              </span>
              <div style={{ flex: 1, height: 1, borderTop: '2px dashed rgba(0,102,255,0.3)' }} />
            </div>

            {/* Cards */}
            {mounted && dispensed.map((item, i) => (
              <a
                key={item.name}
                href={item.href}
                style={{
                  display: 'block',
                  width: '100%',
                  backgroundColor: '#161B22',
                  border: `2px solid ${item.accent}`,
                  borderRadius: 12,
                  padding: '24px 28px',
                  textDecoration: 'none',
                  color: '#F0F0F0',
                  position: 'relative',
                  transform: `rotate(${item.rotation}deg)`,
                  animation: `slideDown 0.6s ease-out ${item.delay}s both`,
                  boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.2)`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = `rotate(0deg) translateY(-4px)`
                  e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.5), 0 0 20px ${item.accent}30`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = `rotate(${item.rotation}deg)`
                  e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.2)`
                }}
              >
                {/* DISPENSED stamp */}
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 16,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: '#FFD23F',
                  opacity: 0.7,
                }}>
                  DISPENSED
                </div>

                <div style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: 1,
                  color: item.accent,
                  marginBottom: 8,
                }}>
                  {item.name}
                </div>

                <div style={{
                  fontSize: 14,
                  color: '#8899AA',
                  lineHeight: 1.5,
                  marginBottom: 16,
                }}>
                  {item.tagline}
                </div>

                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: item.accent,
                }}>
                  View Demo →
                </div>
              </a>
            ))}

            {/* Teaser — next drop */}
            <button
              onClick={handleTeaser}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: '2px dashed rgba(0,102,255,0.3)',
                borderRadius: 12,
                padding: '28px 28px',
                color: '#556677',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'border-color 0.2s, color 0.2s',
                animation: shaking ? 'shake 0.6s ease-in-out' : 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(0,102,255,0.6)'
                e.currentTarget.style.color = '#8899AA'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(0,102,255,0.3)'
                e.currentTarget.style.color = '#556677'
              }}
            >
              🎰 Next drop loading...
            </button>
          </div>

          {/* === FOOTER === */}
          <div style={{
            marginTop: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}>
            {/* Crew */}
            <div style={{ display: 'flex', gap: 12, fontSize: 24 }}>
              {crew.map((e, i) => (
                <span key={i} style={{
                  animation: mounted ? `float 2s ease-in-out ${i * 0.2}s infinite` : 'none',
                  display: 'inline-block',
                }}>
                  {e}
                </span>
              ))}
            </div>

            <div style={{
              fontSize: 12,
              color: '#556677',
              letterSpacing: 0.5,
            }}>
              Powered by caffeine and questionable decisions.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
