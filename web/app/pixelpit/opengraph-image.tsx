import { ImageResponse } from 'next/og'

export const alt = 'Pixelpit — small games. big energy.'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
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
          backgroundColor: '#0f0f1a',
          position: 'relative',
        }}
      >
        {/* Pixel grid background effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexWrap: 'wrap',
            opacity: 0.15,
          }}
        >
          {Array.from({ length: 180 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 40,
                height: 40,
                margin: 10,
                borderRadius: 6,
                backgroundColor: ['#FF1493', '#00FFFF', '#FF8C00', '#00AA66', '#8B5CF6', '#FFD700'][i % 6],
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              fontSize: 120,
              fontWeight: 900,
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ color: '#FF1493' }}>PIXEL</span>
            <span style={{ color: '#00FFFF' }}>PIT</span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 40,
              color: '#9ca3af',
              marginTop: 16,
              fontWeight: 500,
            }}
          >
            small games. big energy.
          </div>

          {/* Character avatars row */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 48,
            }}
          >
            {[
              { name: 'Dot', color: '#FF1493' },
              { name: 'Pit', color: '#FF8C00' },
              { name: 'Bug', color: '#00AA66' },
              { name: 'Chip', color: '#8B5CF6' },
            ].map((char) => (
              <div
                key={char.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    backgroundColor: char.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 36,
                    fontWeight: 900,
                    color: '#fff',
                  }}
                >
                  {char.name[0]}
                </div>
                <span
                  style={{
                    marginTop: 8,
                    fontSize: 20,
                    color: char.color,
                    fontWeight: 700,
                  }}
                >
                  {char.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 24,
            color: '#FFD700',
            fontWeight: 700,
          }}
        >
          pixelpit.gg
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
