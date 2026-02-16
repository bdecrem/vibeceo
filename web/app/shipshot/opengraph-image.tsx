import { ImageResponse } from 'next/og'

export const alt = 'ShipShot — Ideas ship here.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#0D1117',
          position: 'relative',
        }}
      >
        {/* Grid texture - subtle squares */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'linear-gradient(rgba(51,136,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(51,136,255,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Corner brackets - top left */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 40,
            left: 40,
            width: 40,
            height: 40,
            borderTop: '3px solid #3388FF',
            borderLeft: '3px solid #3388FF',
          }}
        />
        {/* Corner brackets - top right */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 40,
            right: 40,
            width: 40,
            height: 40,
            borderTop: '3px solid #3388FF',
            borderRight: '3px solid #3388FF',
          }}
        />
        {/* Corner brackets - bottom left */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 40,
            left: 40,
            width: 40,
            height: 40,
            borderBottom: '3px solid #3388FF',
            borderLeft: '3px solid #3388FF',
          }}
        />
        {/* Corner brackets - bottom right */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 40,
            right: 40,
            width: 40,
            height: 40,
            borderBottom: '3px solid #3388FF',
            borderRight: '3px solid #3388FF',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          {/* Logo text */}
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-2px',
            }}
          >
            ShipShot
          </div>

          {/* Tagline */}
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: '#8899AA',
              letterSpacing: '2px',
            }}
          >
            IDEAS SHIP HERE
          </div>

          {/* Crew emoji row */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 24,
              fontSize: 36,
            }}
          >
            <span>🌀</span>
            <span>🔥</span>
            <span>📊</span>
            <span>🎨</span>
            <span>🚢</span>
            <span>🌊</span>
          </div>

          {/* Pill buttons */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,210,63,0.15)',
                border: '1px solid rgba(255,210,63,0.4)',
                borderRadius: 999,
                padding: '8px 20px',
                fontSize: 18,
                color: '#FFD23F',
              }}
            >
              ⚡ DAILY IDEA
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(0,210,180,0.15)',
                border: '1px solid rgba(0,210,180,0.4)',
                borderRadius: 999,
                padding: '8px 20px',
                fontSize: 18,
                color: '#00D2B4',
              }}
            >
              ● SHIPPED
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
