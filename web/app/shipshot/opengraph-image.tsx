import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ShipShot — Ideas ship here.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#0D1117',
          position: 'relative',
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'linear-gradient(rgba(0,102,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,255,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Corner brackets - top left */}
        <div style={{ display: 'flex', position: 'absolute', top: 24, left: 24, width: 36, height: 36, borderTop: '3px solid rgba(0,102,255,0.25)', borderLeft: '3px solid rgba(0,102,255,0.25)' }} />
        {/* Corner brackets - top right */}
        <div style={{ display: 'flex', position: 'absolute', top: 24, right: 24, width: 36, height: 36, borderTop: '3px solid rgba(0,102,255,0.25)', borderRight: '3px solid rgba(0,102,255,0.25)' }} />
        {/* Corner brackets - bottom left */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 24, left: 24, width: 36, height: 36, borderBottom: '3px solid rgba(0,102,255,0.25)', borderLeft: '3px solid rgba(0,102,255,0.25)' }} />
        {/* Corner brackets - bottom right */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 24, right: 24, width: 36, height: 36, borderBottom: '3px solid rgba(0,102,255,0.25)', borderRight: '3px solid rgba(0,102,255,0.25)' }} />

        {/* Floating gems */}
        <div style={{ display: 'flex', position: 'absolute', top: 80, left: 100, width: 16, height: 16, background: '#FF3860', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 180, left: 60, width: 12, height: 12, background: '#A855F7', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 400, left: 80, width: 14, height: 14, background: '#00E5A0', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 120, right: 120, width: 14, height: 14, background: '#00E5A0', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 480, right: 100, width: 16, height: 16, background: '#FF3860', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 320, right: 80, width: 12, height: 12, background: '#A855F7', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 60, right: 280, width: 10, height: 10, background: '#FFD23F', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 100, left: 300, width: 10, height: 10, background: '#FFD23F', borderRadius: 2 }} />

        {/* LEFT SIDE — Arcade machine */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 480,
            height: '100%',
            paddingLeft: 80,
          }}
        >
          {/* Machine body */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 220,
              height: 340,
              background: '#0066FF',
              borderRadius: 16,
              position: 'relative',
              padding: 20,
            }}
          >
            {/* Machine top accent */}
            <div
              style={{
                display: 'flex',
                width: 180,
                height: 8,
                background: '#3388FF',
                borderRadius: 4,
                marginBottom: 16,
              }}
            />

            {/* Screen */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: 180,
                height: 140,
                background: '#0D1117',
                borderRadius: 8,
                border: '2px solid #3388FF',
              }}
            >
              {/* Gold star on screen */}
              <div
                style={{
                  display: 'flex',
                  fontSize: 48,
                }}
              >
                ⭐
              </div>
            </div>

            {/* Buttons row */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 20,
              }}
            >
              <div style={{ display: 'flex', width: 24, height: 24, borderRadius: 12, background: '#FF3860' }} />
              <div style={{ display: 'flex', width: 24, height: 24, borderRadius: 12, background: '#00E5A0' }} />
              <div style={{ display: 'flex', width: 24, height: 24, borderRadius: 12, background: '#FFD23F' }} />
            </div>

            {/* Dispensing slot */}
            <div
              style={{
                display: 'flex',
                width: 120,
                height: 20,
                background: '#0D1117',
                borderRadius: 4,
                marginTop: 24,
                border: '1px solid #3388FF',
              }}
            />
          </div>
        </div>

        {/* RIGHT SIDE — Wordmark + pills */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            flex: 1,
            paddingRight: 80,
          }}
        >
          {/* Wordmark */}
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, letterSpacing: '-2px' }}>
            <span style={{ color: '#FFFFFF' }}>Ship</span>
            <span style={{ color: '#0066FF' }}>Shot</span>
          </div>

          {/* Tagline */}
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              color: '#8899AA',
              marginTop: 8,
              letterSpacing: '1px',
            }}
          >
            Ideas ship here.
          </div>

          {/* Pill buttons */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,210,63,0.15)',
                border: '1px solid rgba(255,210,63,0.4)',
                borderRadius: 999,
                padding: '8px 18px',
                fontSize: 16,
                color: '#FFD23F',
              }}
            >
              ⚡ DAILY IDEA
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(0,102,255,0.15)',
                border: '1px solid rgba(0,102,255,0.4)',
                borderRadius: 999,
                padding: '8px 18px',
                fontSize: 16,
                color: '#3388FF',
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
