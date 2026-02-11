import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GLOP Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#09090b',
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
        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 300,
            background: 'radial-gradient(circle at center bottom, #a3e63530, transparent 70%)',
          }}
        />

        {/* Slime circles in background */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 150,
            width: 40,
            height: 40,
            borderRadius: 20,
            background: '#22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 180,
            right: 200,
            width: 60,
            height: 60,
            borderRadius: 30,
            background: '#a3e635',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 150,
            left: 200,
            width: 50,
            height: 50,
            borderRadius: 25,
            background: '#facc15',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            right: 180,
            width: 70,
            height: 70,
            borderRadius: 35,
            background: '#f472b6',
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
            borderTop: '4px solid #a3e635',
            borderLeft: '4px solid #a3e635',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '4px solid #a3e635',
            borderRight: '4px solid #a3e635',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '4px solid #a3e635',
            borderLeft: '4px solid #a3e635',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '4px solid #a3e635',
            borderRight: '4px solid #a3e635',
          }}
        />

        {/* Crown emoji */}
        <div style={{ fontSize: 100, marginBottom: 10 }}>👑</div>

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#a3e635',
            letterSpacing: 12,
            marginBottom: 20,
          }}
        >
          GLOP
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
          {score}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 28,
            color: '#71717a',
            letterSpacing: 6,
            marginTop: 10,
          }}
        >
          POINTS
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 24,
            color: '#a3e635',
            letterSpacing: 4,
            marginTop: 25,
          }}
        >
          CAN YOU MAKE THE KING SLIME?
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
