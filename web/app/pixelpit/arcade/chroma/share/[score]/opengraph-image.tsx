import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CHROMA Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #22c55e 0%, #166534 100%)',
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
        {/* Decorative vines */}
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 0,
            bottom: 0,
            width: 8,
            background: '#15803d',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 100,
            top: 0,
            bottom: 0,
            width: 8,
            background: '#15803d',
          }}
        />

        {/* Color circles */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 200,
            width: 50,
            height: 50,
            borderRadius: 25,
            background: '#f472b6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 180,
            right: 250,
            width: 45,
            height: 45,
            borderRadius: 22,
            background: '#22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            left: 250,
            width: 55,
            height: 55,
            borderRadius: 27,
            background: '#facc15',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            right: 200,
            width: 40,
            height: 40,
            borderRadius: 20,
            background: '#a78bfa',
          }}
        />

        {/* Chameleon emoji */}
        <div style={{ fontSize: 100, marginBottom: 10 }}>🦎</div>

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: 8,
            marginBottom: 20,
          }}
        >
          CHROMA
        </div>

        {/* Big score */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          {score}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 32,
            color: '#86efac',
            letterSpacing: 6,
            marginTop: 10,
          }}
        >
          METERS
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 24,
            color: '#86efac',
            letterSpacing: 4,
            marginTop: 25,
          }}
        >
          CAN YOU REACH THE TREETOPS?
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#ffffff',
            letterSpacing: 6,
            opacity: 0.5,
          }}
        >
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
