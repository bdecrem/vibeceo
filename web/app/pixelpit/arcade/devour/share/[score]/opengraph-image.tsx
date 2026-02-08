import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DEVOUR Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'radial-gradient(circle at center, #1a0a2e 0%, #020108 70%)',
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
        {/* Black hole glow */}
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: 200,
            background: 'radial-gradient(circle at center, #8B5CF620 0%, #8B5CF600 70%)',
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
            borderTop: '3px solid #8B5CF6',
            borderLeft: '3px solid #8B5CF6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '3px solid #8B5CF6',
            borderRight: '3px solid #8B5CF6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #a78bfa',
            borderLeft: '3px solid #a78bfa',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #a78bfa',
            borderRight: '3px solid #a78bfa',
          }}
        />

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#a78bfa',
            letterSpacing: 12,
            marginBottom: 20,
          }}
        >
          DEVOUR
        </div>

        {/* Big score */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 900,
            color: '#E5E7EB',
            textShadow: '0 0 80px #8B5CF680',
            lineHeight: 1,
          }}
        >
          {score}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 28,
            color: '#9CA3AF',
            letterSpacing: 6,
            marginTop: 10,
          }}
        >
          FINAL SIZE
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 24,
            color: '#8B5CF6',
            letterSpacing: 4,
            marginTop: 25,
          }}
        >
          CAN YOU BEAT ME?
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#E5E7EB',
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
