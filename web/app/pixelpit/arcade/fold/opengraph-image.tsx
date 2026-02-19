import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FOLD - Pixelpit Arcade';
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
        {/* Cyan shelf lines */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 100 + i * 110,
              left: 200 + i * 40,
              width: 400 - i * 50,
              height: 6,
              background: '#22d3ee',
              opacity: 0.3 - i * 0.04,
              boxShadow: '0 0 10px #22d3ee40',
            }}
          />
        ))}

        {/* Paper sheet - tilted */}
        <div
          style={{
            width: 120,
            height: 85,
            background: '#f5f0e8',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.2), 0 0 40px rgba(245,240,232,0.15)',
            marginBottom: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-8deg)',
          }}
        >
          {/* Stamps on paper */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ color: '#d946ef', fontSize: 18, opacity: 0.7 }}>★</div>
            <div style={{ color: '#facc15', fontSize: 14, opacity: 0.7 }}>✦</div>
            <div style={{ color: '#22d3ee', fontSize: 16, opacity: 0.7 }}>◆</div>
          </div>
        </div>

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
          FOLD
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
          TAP TO FOLD · LAND FLAT · COLLECT STAMPS
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
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #f5f0e8', borderLeft: '3px solid #f5f0e8' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #f5f0e8', borderRight: '3px solid #f5f0e8' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #f5f0e8', borderLeft: '3px solid #f5f0e8' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #f5f0e8', borderRight: '3px solid #f5f0e8' }} />
      </div>
    ),
    { ...size }
  );
}
