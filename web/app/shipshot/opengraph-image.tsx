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
          width: '100%',
          height: '100%',
          backgroundColor: '#0D1117',
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Grid dots - simplified, no backgroundImage */}
        {Array.from({ length: 120 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              position: 'absolute',
              top: Math.floor(i / 15) * 80 + 20,
              left: (i % 15) * 80 + 20,
              width: 2,
              height: 2,
              backgroundColor: 'rgba(51,136,255,0.15)',
              borderRadius: 1,
            }}
          />
        ))}

        {/* Corner brackets - top left */}
        <div style={{ display: 'flex', position: 'absolute', top: 24, left: 24, width: 36, height: 3, backgroundColor: 'rgba(0,102,255,0.3)' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 24, left: 24, width: 3, height: 36, backgroundColor: 'rgba(0,102,255,0.3)' }} />
        {/* top right */}
        <div style={{ display: 'flex', position: 'absolute', top: 24, right: 24, width: 36, height: 3, backgroundColor: 'rgba(0,102,255,0.3)' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 24, right: 24, width: 3, height: 36, backgroundColor: 'rgba(0,102,255,0.3)' }} />
        {/* bottom left */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 24, left: 24, width: 36, height: 3, backgroundColor: 'rgba(0,102,255,0.3)' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 24, left: 24, width: 3, height: 36, backgroundColor: 'rgba(0,102,255,0.3)' }} />
        {/* bottom right */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 24, right: 24, width: 36, height: 3, backgroundColor: 'rgba(0,102,255,0.3)' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 24, right: 24, width: 3, height: 36, backgroundColor: 'rgba(0,102,255,0.3)' }} />

        {/* Floating gems */}
        <div style={{ display: 'flex', position: 'absolute', top: 80, left: 100, width: 14, height: 14, backgroundColor: '#FF3860', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 180, left: 60, width: 10, height: 10, backgroundColor: '#A855F7', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 420, left: 80, width: 12, height: 12, backgroundColor: '#00E5A0', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 120, right: 120, width: 12, height: 12, backgroundColor: '#00E5A0', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 480, right: 100, width: 14, height: 14, backgroundColor: '#FF3860', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 320, right: 80, width: 10, height: 10, backgroundColor: '#A855F7', borderRadius: 2 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 60, right: 280, width: 8, height: 8, backgroundColor: '#FFD23F', borderRadius: 2 }} />

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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 220,
              height: 340,
              backgroundColor: '#0066FF',
              borderRadius: 16,
              padding: 20,
            }}
          >
            {/* Top accent bar */}
            <div style={{ display: 'flex', width: 180, height: 8, backgroundColor: '#3388FF', borderRadius: 4, marginBottom: 16 }} />

            {/* Screen */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: 180,
                height: 140,
                backgroundColor: '#0D1117',
                borderRadius: 8,
                border: '2px solid #3388FF',
              }}
            >
              <div style={{ display: 'flex', fontSize: 48 }}>⭐</div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <div style={{ display: 'flex', width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF3860' }} />
              <div style={{ display: 'flex', width: 24, height: 24, borderRadius: 12, backgroundColor: '#00E5A0' }} />
              <div style={{ display: 'flex', width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFD23F' }} />
            </div>

            {/* Slot */}
            <div style={{ display: 'flex', width: 120, height: 20, backgroundColor: '#0D1117', borderRadius: 4, marginTop: 24, border: '1px solid #3388FF' }} />
          </div>
        </div>

        {/* RIGHT SIDE — Wordmark */}
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
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800 }}>
            <span style={{ color: '#FFFFFF' }}>Ship</span>
            <span style={{ color: '#0066FF' }}>Shot</span>
          </div>

          <div style={{ display: 'flex', fontSize: 24, color: '#8899AA', marginTop: 8 }}>
            Ideas ship here.
          </div>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255,210,63,0.15)',
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
                backgroundColor: 'rgba(0,102,255,0.15)',
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
