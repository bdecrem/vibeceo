import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  // Soundscape color palette
  const bgColor = '#0a0a0f'
  const goldColor = '#D4A574'
  const tealColor = '#2D9596'
  const particleColors = ['#D4A574', '#FFD700', '#2D9596', '#7B68EE', '#4ECDC4', '#FF6B6B']

  // Generate random particles with collision lines
  const particles: { x: number; y: number; r: number; color: string }[] = []
  for (let i = 0; i < 24; i++) {
    particles.push({
      x: 100 + Math.random() * 1000,
      y: 100 + Math.random() * 430,
      r: 20 + Math.random() * 35,
      color: particleColors[i % particleColors.length],
    })
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bgColor,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x - p.r,
              top: p.y - p.r,
              width: p.r * 2,
              height: p.r * 2,
              borderRadius: '50%',
              backgroundColor: p.color,
              opacity: 0.5 + Math.random() * 0.3,
              boxShadow: `0 0 ${20 + Math.random() * 30}px ${p.color}`,
            }}
          />
        ))}

        {/* Collision lines/arcs */}
        <svg
          width="1200"
          height="630"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* Connection lines between some particles */}
          {particles.slice(0, 12).map((p, i) => {
            const next = particles[(i + 1) % 12]
            return (
              <line
                key={i}
                x1={p.x}
                y1={p.y}
                x2={next.x}
                y2={next.y}
                stroke={tealColor}
                strokeWidth="1"
                opacity="0.3"
              />
            )
          })}
        </svg>

        {/* Main content overlay */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
            padding: '40px 60px',
            backgroundColor: 'rgba(10, 10, 15, 0.85)',
            borderRadius: 20,
            border: `1px solid ${tealColor}40`,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 90,
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: goldColor,
              fontFamily: 'monospace',
            }}
          >
            SOUNDSCAPE
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 28,
              color: tealColor,
              marginTop: 16,
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
            }}
          >
            Particles collide. Music emerges.
          </div>

          {/* Scale/Tone indicators */}
          <div
            style={{
              display: 'flex',
              gap: 40,
              marginTop: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: goldColor,
                }}
              />
              <span
                style={{
                  fontSize: 18,
                  color: 'rgba(212, 165, 116, 0.7)',
                  fontFamily: 'monospace',
                }}
              >
                SCALE
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: tealColor,
                }}
              />
              <span
                style={{
                  fontSize: 18,
                  color: 'rgba(45, 149, 150, 0.7)',
                  fontFamily: 'monospace',
                }}
              >
                TONE
              </span>
            </div>
          </div>
        </div>

        {/* Bottom attribution */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 20,
            color: 'rgba(212, 165, 116, 0.5)',
            fontFamily: 'monospace',
          }}
        >
          <span>by</span>
          <span style={{ color: goldColor, fontWeight: 700 }}>Amber</span>
          <span style={{ marginLeft: 16 }}>intheamber.com</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
