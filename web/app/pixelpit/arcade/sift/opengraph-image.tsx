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
        {/* Grid lines */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '0 100px',
            opacity: 0.08,
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                width: '100%',
                height: 1,
                background: '#a3e635',
              }}
            />
          ))}
        </div>

        {/* Vertical grid */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 100px',
            opacity: 0.08,
          }}
        >
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              style={{
                width: 1,
                height: '100%',
                background: '#a3e635',
              }}
            />
          ))}
        </div>

        {/* Rotating layers with gaps */}
        <div style={{ position: 'absolute', top: 180, left: 150, width: 120, height: 12, background: '#22d3ee', borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 180, right: 150, width: 80, height: 12, background: '#22d3ee', borderRadius: 2 }} />
        
        <div style={{ position: 'absolute', top: 260, left: 200, width: 140, height: 12, background: '#d946ef', boxShadow: '0 0 15px #d946ef40', borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 260, right: 200, width: 100, height: 12, background: '#d946ef', boxShadow: '0 0 15px #d946ef40', borderRadius: 2 }} />
        
        <div style={{ position: 'absolute', top: 340, left: 180, width: 160, height: 12, background: '#22d3ee', borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 340, right: 160, width: 90, height: 12, background: '#22d3ee', borderRadius: 2 }} />

        {/* Black death layer */}
        <div style={{ position: 'absolute', top: 420, left: 100, right: 100, height: 12, background: '#111111', borderRadius: 2 }} />

        {/* Mercury ball - center top */}
        <div
          style={{
            position: 'absolute',
            top: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#e8e8f0',
            boxShadow: '0 0 40px #e8e8f080, 0 0 80px #e8e8f040',
          }}
        />
        {/* Mercury highlight */}
        <div
          style={{
            position: 'absolute',
            top: 126,
            left: '48%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#ffffff',
            opacity: 0.6,
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
            marginTop: 20,
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

        {/* Combo indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            fontSize: 32,
            color: '#a3e635',
            letterSpacing: 4,
            opacity: 0.8,
          }}
        >
          CHAIN DROPS FOR 5X COMBOS
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
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #facc15', borderLeft: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #facc15', borderRight: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #facc15', borderLeft: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #facc15', borderRight: '3px solid #facc15' }} />

        {/* Magnetic field indicators */}
        <div style={{ position: 'absolute', top: 250, left: 120, width: 2, height: 20, background: '#d946ef', opacity: 0.6 }} />
        <div style={{ position: 'absolute', top: 270, left: 118, width: 6, height: 2, background: '#d946ef', opacity: 0.6 }} />
        <div style={{ position: 'absolute', top: 250, right: 120, width: 2, height: 20, background: '#d946ef', opacity: 0.6 }} />
        <div style={{ position: 'absolute', top: 270, right: 118, width: 6, height: 2, background: '#d946ef', opacity: 0.6 }} />
      </div>
    ),
    { ...size }
  );
}