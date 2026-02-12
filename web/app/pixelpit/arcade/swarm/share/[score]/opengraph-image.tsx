import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SWARM Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #e0f2fe 0%, #f0fdf4 50%, #86efac 100%)',
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
        {/* Decorative flowers */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 150,
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
            right: 200,
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
            left: 200,
            width: 55,
            height: 55,
            borderRadius: 27,
            background: '#a78bfa',
          }}
        />

        {/* Bee emoji */}
        <div style={{ fontSize: 100, marginBottom: 10 }}>🐝</div>

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#1e293b',
            letterSpacing: 8,
            marginBottom: 20,
          }}
        >
          SWARM
        </div>

        {/* Big score */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            color: '#1e293b',
            lineHeight: 1,
          }}
        >
          {score}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 32,
            color: '#facc15',
            letterSpacing: 6,
            marginTop: 10,
          }}
        >
          ⭐ STARS ⭐
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 24,
            color: '#71717a',
            letterSpacing: 4,
            marginTop: 25,
          }}
        >
          CAN YOU GUIDE THE BEES?
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#1e293b',
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
