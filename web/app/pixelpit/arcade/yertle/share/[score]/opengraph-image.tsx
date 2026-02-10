import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'YERTLE Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #f0f9ff 0%, #22d3ee 100%)',
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
        {/* Water waves at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            background: '#22d3ee',
          }}
        />

        {/* Corner accents - PLAYROOM style with black borders */}
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: 25,
            width: 35,
            height: 35,
            borderTop: '4px solid #18181b',
            borderLeft: '4px solid #18181b',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '4px solid #18181b',
            borderRight: '4px solid #18181b',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '4px solid #18181b',
            borderLeft: '4px solid #18181b',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '4px solid #18181b',
            borderRight: '4px solid #18181b',
          }}
        />

        {/* Turtle emoji */}
        <div style={{ fontSize: 100, marginBottom: 10 }}>🐢</div>

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#34d399',
            letterSpacing: 12,
            marginBottom: 20,
          }}
        >
          YERTLE
        </div>

        {/* Big score */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 900,
            color: '#18181b',
            lineHeight: 1,
          }}
        >
          {score}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 28,
            color: '#64748b',
            letterSpacing: 6,
            marginTop: 10,
          }}
        >
          TURTLES STACKED
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 24,
            color: '#34d399',
            letterSpacing: 4,
            marginTop: 25,
          }}
        >
          CAN YOU STACK HIGHER?
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#18181b',
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
