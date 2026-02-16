import { ImageResponse } from 'next/og'

export const alt = 'contxt — your personal CRM, shaped by AI'
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
          backgroundColor: '#0a0a1a',
          position: 'relative',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Subtle grid dots */}
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              position: 'absolute',
              top: Math.floor(i / 10) * 80 + 20,
              left: (i % 10) * 120 + 30,
              width: 2,
              height: 2,
              backgroundColor: '#00CEC940',
              borderRadius: 1,
            }}
          />
        ))}

        {/* Corner accents — top left */}
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 40, height: 3, backgroundColor: '#00CEC950' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 3, height: 40, backgroundColor: '#00CEC950' }} />
        {/* top right */}
        <div style={{ display: 'flex', position: 'absolute', top: 28, right: 28, width: 40, height: 3, backgroundColor: '#00CEC950' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 28, right: 28, width: 3, height: 40, backgroundColor: '#00CEC950' }} />
        {/* bottom left */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, left: 28, width: 40, height: 3, backgroundColor: '#00CEC950' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, left: 28, width: 3, height: 40, backgroundColor: '#00CEC950' }} />
        {/* bottom right */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 40, height: 3, backgroundColor: '#00CEC950' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 3, height: 40, backgroundColor: '#00CEC950' }} />

        {/* Decorative people cards — left */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 80, top: 140, gap: 24 }}>
          {[
            { name: 160, tag: 80 },
            { name: 120, tag: 100 },
            { name: 180, tag: 60 },
            { name: 140, tag: 90 },
            { name: 100, tag: 70 },
            { name: 160, tag: 80 },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#00CEC930',
                  border: '2px solid #00CEC960',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  height: 10,
                  width: row.name,
                  backgroundColor: '#33335540',
                  borderRadius: 5,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  height: 8,
                  width: row.tag,
                  backgroundColor: '#00CEC915',
                  borderRadius: 4,
                  border: '1px solid #00CEC930',
                }}
              />
            </div>
          ))}
        </div>

        {/* Decorative people cards — right */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', right: 80, top: 160, gap: 24 }}>
          {[
            { name: 140, tag: 90 },
            { name: 180, tag: 70 },
            { name: 120, tag: 100 },
            { name: 160, tag: 60 },
            { name: 100, tag: 80 },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#00CEC930',
                  border: '2px solid #00CEC960',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  height: 10,
                  width: row.name,
                  backgroundColor: '#33335540',
                  borderRadius: 5,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  height: 8,
                  width: row.tag,
                  backgroundColor: '#00CEC915',
                  borderRadius: 4,
                  border: '1px solid #00CEC930',
                }}
              />
            </div>
          ))}
        </div>

        {/* Center content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 800,
              color: '#eeeeee',
              letterSpacing: -2,
            }}
          >
            contxt
          </div>

          {/* Tagline */}
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              color: '#888888',
              marginTop: 8,
            }}
          >
            your personal CRM, shaped by AI
          </div>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 14, marginTop: 36 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#00CEC920',
                border: '1px solid #00CEC950',
                borderRadius: 999,
                padding: '8px 20px',
                fontSize: 16,
                color: '#00CEC9',
              }}
            >
              never lose touch
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#22c55e18',
                border: '1px solid #22c55e40',
                borderRadius: 999,
                padding: '8px 20px',
                fontSize: 16,
                color: '#86efac',
              }}
            >
              your own fork
            </div>
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 36,
            fontSize: 18,
            color: '#555555',
          }}
        >
          kochi.to/contxt
        </div>
      </div>
    ),
    { ...size }
  )
}
