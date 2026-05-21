'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#DDA0DD', '#98D8C8', '#F7DC6F']

export default function HelloWorld() {
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const [bgColor, setBgColor] = useState('#0a0a0a')

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClick = () => {
    const next = clickCount + 1
    setClickCount(next)
    setBgColor(COLORS[next % COLORS.length])
    setTimeout(() => setBgColor('#0a0a0a'), 300)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
        transition: 'background 0.3s ease',
        cursor: 'crosshair',
        overflow: 'hidden',
        position: 'relative',
      }}
      onClick={handleClick}
    >
      {/* Floating dots */}
      {mounted && Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 6 + (i % 4) * 3,
            height: 6 + (i % 4) * 3,
            borderRadius: '50%',
            background: COLORS[i % COLORS.length],
            opacity: 0.3,
            left: `${10 + (i * 7.5) % 85}%`,
            top: `${15 + (i * 11.3) % 70}%`,
            animation: `float${i % 3} ${3 + i * 0.4}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* Main text */}
      <h1
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fontSize: 'clamp(3rem, 10vw, 8rem)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          background: hovered
            ? 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #FFE66D, #A8E6CF, #FF8B94)'
            : 'linear-gradient(135deg, #fff 0%, #999 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          backgroundSize: hovered ? '200% 200%' : '100% 100%',
          animation: hovered ? 'gradient 2s ease infinite' : 'none',
          transition: 'all 0.4s ease',
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.9)',
          opacity: mounted ? 1 : 0,
          margin: 0,
          lineHeight: 1.1,
          zIndex: 1,
          userSelect: 'none',
        }}
      >
        hello
        <br />
        world
      </h1>

      {/* Subtitle */}
      <p
        style={{
          color: '#666',
          fontSize: 'clamp(0.8rem, 2vw, 1.1rem)',
          marginTop: '2rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease 0.3s',
          zIndex: 1,
        }}
      >
        click anywhere
      </p>

      {/* Click counter */}
      {clickCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            color: '#444',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
          }}
        >
          {clickCount} {clickCount === 1 ? 'click' : 'clicks'}
        </div>
      )}

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float0 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(12px, -18px) scale(1.2); }
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-15px, 12px) scale(0.8); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(8px, 20px) scale(1.1); }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
      `}</style>
    </div>
  )
}
