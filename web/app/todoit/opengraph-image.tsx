import { ImageResponse } from 'next/og'

export const alt = 'todoit — your todo app, shaped by AI'
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
              backgroundColor: '#6366f140',
              borderRadius: 1,
            }}
          />
        ))}

        {/* Corner accents — top left */}
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 40, height: 3, backgroundColor: '#6366f150' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 3, height: 40, backgroundColor: '#6366f150' }} />
        {/* top right */}
        <div style={{ display: 'flex', position: 'absolute', top: 28, right: 28, width: 40, height: 3, backgroundColor: '#6366f150' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 28, right: 28, width: 3, height: 40, backgroundColor: '#6366f150' }} />
        {/* bottom left */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, left: 28, width: 40, height: 3, backgroundColor: '#6366f150' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, left: 28, width: 3, height: 40, backgroundColor: '#6366f150' }} />
        {/* bottom right */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 40, height: 3, backgroundColor: '#6366f150' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 3, height: 40, backgroundColor: '#6366f150' }} />

        {/* Fake checkbox rows — left decorative column */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 80, top: 140, gap: 28 }}>
          {[
            { checked: true, w: 160 },
            { checked: false, w: 200 },
            { checked: true, w: 140 },
            { checked: false, w: 180 },
            { checked: false, w: 120 },
            { checked: true, w: 160 },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: row.checked ? '2px solid #6366f1' : '2px solid #333',
                  backgroundColor: row.checked ? '#6366f130' : '#00000000',
                }}
              >
                {row.checked && (
                  <div style={{ display: 'flex', width: 8, height: 8, borderRadius: 2, backgroundColor: '#6366f1' }} />
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  height: 10,
                  width: row.w,
                  backgroundColor: row.checked ? '#33335580' : '#33335540',
                  borderRadius: 5,
                }}
              />
            </div>
          ))}
        </div>

        {/* Fake checkbox rows — right decorative column */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', right: 80, top: 160, gap: 28 }}>
          {[
            { checked: false, w: 180 },
            { checked: true, w: 140 },
            { checked: false, w: 200 },
            { checked: true, w: 120 },
            { checked: false, w: 160 },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: row.checked ? '2px solid #6366f1' : '2px solid #333',
                  backgroundColor: row.checked ? '#6366f130' : '#00000000',
                }}
              >
                {row.checked && (
                  <div style={{ display: 'flex', width: 8, height: 8, borderRadius: 2, backgroundColor: '#6366f1' }} />
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  height: 10,
                  width: row.w,
                  backgroundColor: row.checked ? '#33335580' : '#33335540',
                  borderRadius: 5,
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
            todoit
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
            your todo app, shaped by AI
          </div>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 14, marginTop: 36 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#6366f120',
                border: '1px solid #6366f150',
                borderRadius: 999,
                padding: '8px 20px',
                fontSize: 16,
                color: '#a5b4fc',
              }}
            >
              ask AI to change anything
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
          kochi.to/todoit
        </div>
      </div>
    ),
    { ...size }
  )
}
