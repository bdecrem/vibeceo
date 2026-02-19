import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CLUMP Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

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
            opacity: 0.06,
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

        {/* Scattered tier objects */}
        <div style={{ position: 'absolute', top: 100, left: 150, width: 6, height: 6, borderRadius: 9999, background: '#555555' }} />
        <div style={{ position: 'absolute', top: 180, right: 200, width: 16, height: 16, borderRadius: 9999, background: '#22d3ee', boxShadow: '0 0 15px #22d3ee40' }} />
        <div style={{ position: 'absolute', bottom: 160, left: 250, width: 24, height: 24, borderRadius: 9999, background: '#d946ef', boxShadow: '0 0 20px #d946ef40' }} />
        <div style={{ position: 'absolute', bottom: 120, right: 300, width: 36, height: 36, borderRadius: 9999, background: '#facc15', boxShadow: '0 0 30px #facc1540' }} />

        {/* Player blob */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 9999,
            background: '#a3e635',
            boxShadow: '0 0 50px #a3e63580',
            marginBottom: 20,
          }}
        />

        {/* Score */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 700,
            color: '#a3e635',
            letterSpacing: 10,
            textShadow: '0 0 80px #a3e63580',
            lineHeight: 1,
            marginBottom: 10,
          }}
        >
          {score}
        </div>

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: 12,
            opacity: 0.9,
            marginBottom: 15,
          }}
        >
          CLUMP
        </div>

        {/* Challenge */}
        <div
          style={{
            fontSize: 28,
            color: '#22d3ee',
            letterSpacing: 8,
          }}
        >
          CAN YOU BEAT ME?
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 22,
            color: '#ffffff',
            letterSpacing: 6,
            opacity: 0.5,
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
