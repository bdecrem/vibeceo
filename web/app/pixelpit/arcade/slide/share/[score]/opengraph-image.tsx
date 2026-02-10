import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SLIDE Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #c4b5fd 0%, #4c1d95 100%)',
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
        {/* Moon */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 100,
            width: 80,
            height: 80,
            borderRadius: 40,
            background: '#e2e8f0',
          }}
        />

        {/* Snow hills */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background: '#e0e7ff',
            borderRadius: '100% 100% 0 0',
          }}
        />

        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: 25,
            width: 35,
            height: 35,
            borderTop: '4px solid #f472b6',
            borderLeft: '4px solid #f472b6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '4px solid #f472b6',
            borderRight: '4px solid #f472b6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '4px solid #f472b6',
            borderLeft: '4px solid #f472b6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '4px solid #f472b6',
            borderRight: '4px solid #f472b6',
          }}
        />

        {/* Penguin emoji */}
        <div style={{ fontSize: 100, marginBottom: 10 }}>🐧</div>

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#f472b6',
            letterSpacing: 12,
            marginBottom: 20,
          }}
        >
          SLIDE
        </div>

        {/* Big score */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          {score}m
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 28,
            color: '#c4b5fd',
            letterSpacing: 6,
            marginTop: 10,
          }}
        >
          BEFORE NIGHTFALL
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 24,
            color: '#f472b6',
            letterSpacing: 4,
            marginTop: 25,
          }}
        >
          CAN YOU GO FARTHER?
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
