import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FOLD Score - Pixelpit Arcade';
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
        {/* Filing cabinet lines */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 80px',
            opacity: 0.06,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                width: 1,
                height: '100%',
                background: '#22d3ee',
              }}
            />
          ))}
        </div>

        {/* Shelves */}
        <div style={{ position: 'absolute', top: 130, left: 200, right: 200, height: 4, background: '#22d3ee', boxShadow: '0 0 12px #22d3ee40' }} />
        <div style={{ position: 'absolute', bottom: 160, left: 250, right: 250, height: 4, background: '#22d3ee', boxShadow: '0 0 12px #22d3ee40' }} />

        {/* Paper sheet */}
        <div
          style={{
            width: 70,
            height: 90,
            background: '#f5f0e8',
            boxShadow: '0 4px 20px #00000080',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
          }}
        >
          {/* Fold crease */}
          <div style={{ width: 50, height: 1, background: '#d4c5a9' }} />
        </div>

        {/* Stamps */}
        <div style={{ position: 'absolute', top: 240, left: 560, width: 16, height: 16, borderRadius: 9999, background: '#d946ef', opacity: 0.7 }} />
        <div style={{ position: 'absolute', top: 255, left: 620, width: 12, height: 12, borderRadius: 9999, background: '#facc15', opacity: 0.7 }} />

        {/* Score */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 700,
            color: '#f5f0e8',
            letterSpacing: 10,
            textShadow: '0 0 60px #f5f0e840',
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
            color: '#22d3ee',
            letterSpacing: 12,
            marginBottom: 15,
          }}
        >
          FOLD
        </div>

        {/* Challenge */}
        <div
          style={{
            fontSize: 28,
            color: '#d946ef',
            letterSpacing: 8,
          }}
        >
          CAN YOU BEAT ME?
        </div>

        {/* Branding */}
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
