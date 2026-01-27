import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RAIN Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Ambient gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background: 'linear-gradient(transparent, rgba(34, 211, 238, 0.15))',
          }}
        />

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#22d3ee',
            letterSpacing: 12,
            marginBottom: 20,
          }}
        >
          RAIN
        </div>

        {/* Big score */}
        <div
          style={{
            fontSize: 220,
            fontWeight: 700,
            color: '#fbbf24',
            lineHeight: 1,
          }}
        >
          {score}
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 32,
            color: '#f472b6',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          CAN YOU CATCH MORE?
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#f8fafc',
            letterSpacing: 6,
            opacity: 0.7,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 25, left: 25, width: 35, height: 35, borderTop: '3px solid #fbbf24', borderLeft: '3px solid #fbbf24' }} />
        <div style={{ position: 'absolute', top: 25, right: 25, width: 35, height: 35, borderTop: '3px solid #fbbf24', borderRight: '3px solid #fbbf24' }} />
        <div style={{ position: 'absolute', bottom: 25, left: 25, width: 35, height: 35, borderBottom: '3px solid #fbbf24', borderLeft: '3px solid #fbbf24' }} />
        <div style={{ position: 'absolute', bottom: 25, right: 25, width: 35, height: 35, borderBottom: '3px solid #fbbf24', borderRight: '3px solid #fbbf24' }} />
      </div>
    ),
    { ...size }
  );
}
