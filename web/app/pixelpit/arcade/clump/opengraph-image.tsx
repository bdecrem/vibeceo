import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CLUMP - Pixelpit Arcade';
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

        {/* Tier objects scattered */}
        {/* Tier 1 - grey dust */}
        <div style={{ position: 'absolute', top: 120, left: 180, width: 8, height: 8, borderRadius: 9999, background: '#555555' }} />
        <div style={{ position: 'absolute', top: 200, left: 280, width: 6, height: 6, borderRadius: 9999, background: '#555555' }} />
        <div style={{ position: 'absolute', top: 350, right: 250, width: 7, height: 7, borderRadius: 9999, background: '#555555' }} />
        <div style={{ position: 'absolute', bottom: 180, left: 320, width: 5, height: 5, borderRadius: 9999, background: '#555555' }} />

        {/* Tier 2 - cyan */}
        <div style={{ position: 'absolute', top: 160, right: 200, width: 18, height: 18, borderRadius: 9999, background: '#22d3ee', boxShadow: '0 0 20px #22d3ee40' }} />
        <div style={{ position: 'absolute', bottom: 200, left: 200, width: 14, height: 14, borderRadius: 9999, background: '#22d3ee', boxShadow: '0 0 15px #22d3ee40' }} />

        {/* Tier 3 - fuchsia */}
        <div style={{ position: 'absolute', top: 140, left: 500, width: 28, height: 28, borderRadius: 9999, background: '#d946ef', boxShadow: '0 0 30px #d946ef40' }} />
        <div style={{ position: 'absolute', bottom: 150, right: 180, width: 24, height: 24, borderRadius: 9999, background: '#d946ef', boxShadow: '0 0 25px #d946ef40' }} />

        {/* Tier 4 - gold */}
        <div style={{ position: 'absolute', top: 100, right: 400, width: 40, height: 40, borderRadius: 9999, background: '#facc15', boxShadow: '0 0 40px #facc1540' }} />

        {/* Player blob - center */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 9999,
            background: '#a3e635',
            boxShadow: '0 0 60px #a3e63580, 0 0 120px #a3e63540',
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
          CLUMP
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
          ABSORB EVERYTHING
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
      </div>
    ),
    { ...size }
  );
}
