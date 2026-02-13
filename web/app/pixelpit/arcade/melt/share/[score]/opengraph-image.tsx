import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MELT Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #1a0000 100%)',
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
        {/* Lava slash */}
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 300,
            width: 200,
            height: 4,
            background: '#ff4400',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 160,
            right: 300,
            width: 180,
            height: 4,
            background: '#ff4400',
          }}
        />

        {/* Heat glow from below */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 180,
            background: 'linear-gradient(180deg, #00000000 0%, #8b000030 100%)',
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
            borderTop: '3px solid #444444',
            borderLeft: '3px solid #444444',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '3px solid #444444',
            borderRight: '3px solid #444444',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #cc2200',
            borderLeft: '3px solid #cc2200',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #cc2200',
            borderRight: '3px solid #cc2200',
          }}
        />

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: '#cc2200',
            letterSpacing: 16,
            marginBottom: 20,
          }}
        >
          MELT
        </div>

        {/* Big score */}
        <div
          style={{
            fontSize: 200,
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
            fontSize: 24,
            color: '#444444',
            letterSpacing: 8,
            marginTop: 10,
          }}
        >
          POINTS
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 22,
            color: '#ff4400',
            letterSpacing: 6,
            marginTop: 20,
          }}
        >
          CAN YOU SURVIVE THE HEAT?
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 18,
            color: '#444444',
            letterSpacing: 8,
          }}
        >
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
