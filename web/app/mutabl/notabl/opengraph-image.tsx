import { ImageResponse } from 'next/og'

export const alt = 'notabl — documents that evolve'
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
              backgroundColor: '#FD79A840',
              borderRadius: 1,
            }}
          />
        ))}

        {/* Corner accents */}
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 40, height: 3, backgroundColor: '#FD79A850' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 3, height: 40, backgroundColor: '#FD79A850' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 28, right: 28, width: 40, height: 3, backgroundColor: '#FD79A850' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 28, right: 28, width: 3, height: 40, backgroundColor: '#FD79A850' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, left: 28, width: 40, height: 3, backgroundColor: '#FD79A850' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, left: 28, width: 3, height: 40, backgroundColor: '#FD79A850' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 40, height: 3, backgroundColor: '#FD79A850' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 3, height: 40, backgroundColor: '#FD79A850' }} />

        {/* Decorative document lines — left */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 80, top: 140, gap: 20 }}>
          {[
            { w: 180, h: 12 },
            { w: 220, h: 8 },
            { w: 160, h: 8 },
            { w: 200, h: 8 },
            { w: 140, h: 12 },
            { w: 190, h: 8 },
            { w: 170, h: 8 },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                height: row.h,
                width: row.w,
                backgroundColor: row.h === 12 ? '#FD79A820' : '#33335530',
                borderRadius: row.h === 12 ? 6 : 4,
                borderLeft: row.h === 12 ? '3px solid #FD79A840' : 'none',
              }}
            />
          ))}
        </div>

        {/* Decorative document lines — right */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', right: 80, top: 160, gap: 20 }}>
          {[
            { w: 160, h: 8 },
            { w: 200, h: 12 },
            { w: 180, h: 8 },
            { w: 140, h: 8 },
            { w: 220, h: 8 },
            { w: 170, h: 12 },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                height: row.h,
                width: row.w,
                backgroundColor: row.h === 12 ? '#FD79A820' : '#33335530',
                borderRadius: row.h === 12 ? 6 : 4,
                borderLeft: row.h === 12 ? '3px solid #FD79A840' : 'none',
              }}
            />
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
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 800,
              color: '#eeeeee',
              letterSpacing: -2,
            }}
          >
            notabl
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 26,
              color: '#888888',
              marginTop: 8,
            }}
          >
            documents that evolve
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 36 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FD79A820',
                border: '1px solid #FD79A850',
                borderRadius: 999,
                padding: '8px 20px',
                fontSize: 16,
                color: '#FD79A8',
              }}
            >
              write and share
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
          mutabl.co/notabl
        </div>
      </div>
    ),
    { ...size }
  )
}
