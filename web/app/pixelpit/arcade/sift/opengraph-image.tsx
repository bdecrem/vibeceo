import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SIFT - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Horizontal layer lines */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 60 + i * 75,
              left: 0,
              right: 0,
              height: 10,
              background: i === 5 ? '#d946ef' : '#22d3ee',
              opacity: i === 5 ? 0.5 : 0.15,
            }}
          />
        ))}

        {/* Gap glows in layers */}
        <div style={{ position: 'absolute', top: 60, left: 450, width: 120, height: 10, background: '#a3e635', opacity: 0.3, boxShadow: '0 0 20px #a3e63560' }} />
        <div style={{ position: 'absolute', top: 135, left: 550, width: 100, height: 10, background: '#a3e635', opacity: 0.3, boxShadow: '0 0 20px #a3e63560' }} />
        <div style={{ position: 'absolute', top: 210, left: 380, width: 130, height: 10, background: '#a3e635', opacity: 0.3, boxShadow: '0 0 20px #a3e63560' }} />

        {/* Mercury ball */}
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 9999,
            background: '#e8e8f0',
            boxShadow: '0 0 40px #e8e8f060, 0 0 80px #e8e8f030',
            marginBottom: 30,
          }}
        />

        {/* Main title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            color: '#a3e635',
            letterSpacing: 20,
            textShadow: '0 0 60px #a3e63580',
            marginBottom: 10,
          }}
        >
          SIFT
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#22d3ee',
            letterSpacing: 8,
            marginBottom: 40,
          }}
        >
          DRAG TO ROTATE · LET MERCURY FALL
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#ffffff',
            letterSpacing: 6,
            opacity: 0.6,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #22d3ee', borderLeft: '3px solid #22d3ee' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #22d3ee', borderRight: '3px solid #22d3ee' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #22d3ee', borderLeft: '3px solid #22d3ee' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #22d3ee', borderRight: '3px solid #22d3ee' }} />
      </div>
    ),
    { ...size }
  );
}
