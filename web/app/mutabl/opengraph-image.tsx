import { ImageResponse } from 'next/og'

export const alt = 'mutabl — apps you make yours'
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
          backgroundColor: '#fafaf9',
          position: 'relative',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
        }}
      >
        {/* Four colored dots — scattered decoratively */}
        <div style={{ display: 'flex', position: 'absolute', top: 80, left: 160, width: 10, height: 10, borderRadius: 5, backgroundColor: '#6C5CE7' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 120, right: 200, width: 8, height: 8, borderRadius: 4, backgroundColor: '#00CEC9' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 140, left: 220, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FD79A8' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 100, right: 180, width: 11, height: 11, borderRadius: 6, backgroundColor: '#FDCB6E' }} />

        {/* Faint dot grid */}
        <div style={{ display: 'flex', position: 'absolute', top: 200, left: 100, width: 6, height: 6, borderRadius: 3, backgroundColor: '#6C5CE720' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 300, left: 140, width: 6, height: 6, borderRadius: 3, backgroundColor: '#00CEC920' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 250, right: 120, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FD79A820' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 350, right: 160, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FDCB6E20' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 160, left: 500, width: 6, height: 6, borderRadius: 3, backgroundColor: '#6C5CE715' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 400, left: 400, width: 6, height: 6, borderRadius: 3, backgroundColor: '#00CEC915' }} />

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 108,
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: -1,
          }}
        >
          MUTABL
          <div
            style={{
              display: 'flex',
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#6C5CE7',
              marginLeft: 10,
              alignSelf: 'flex-end',
              marginBottom: 16,
            }}
          />
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            color: '#a8a29e',
            marginTop: 8,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          apps you make yours
        </div>

        {/* App cards */}
        <div style={{ display: 'flex', gap: 24, marginTop: 48 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 24px',
              borderRadius: 10,
              border: '1px solid #6C5CE730',
              backgroundColor: '#6C5CE708',
              width: 200,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ display: 'flex', width: 7, height: 7, borderRadius: 4, backgroundColor: '#6C5CE7' }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', letterSpacing: 1.5 }}>TODOIT</span>
            </div>
            <span style={{ fontSize: 12, color: '#999' }}>tasks, shaped by you</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 24px',
              borderRadius: 10,
              border: '1px solid #00CEC930',
              backgroundColor: '#00CEC908',
              width: 200,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ display: 'flex', width: 7, height: 7, borderRadius: 4, backgroundColor: '#00CEC9' }} />
              <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', letterSpacing: 1.5 }}>CONTXT</span>
            </div>
            <span style={{ fontSize: 12, color: '#999' }}>relationships, never forgotten</span>
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 32,
            fontSize: 13,
            color: '#d6d3d1',
            letterSpacing: 2,
          }}
        >
          mutabl.io
        </div>
      </div>
    ),
    { ...size }
  )
}
