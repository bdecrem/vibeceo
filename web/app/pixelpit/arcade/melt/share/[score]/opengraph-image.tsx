import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MELT Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const layers = params.score;
  const won = parseInt(layers) >= 40;
  const tagline = won ? 'REACHED HELL!' : 'CAN YOU BEAT ME?';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #1e3a5f 0%, #7f1d1d 100%)',
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
        {/* Ice decoration top left */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 100,
            width: 120,
            height: 120,
            borderRadius: 60,
            border: '12px solid #0ea5e9',
            opacity: 0.3,
          }}
        />

        {/* Lava decoration bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            right: 100,
            width: 140,
            height: 140,
            borderRadius: 70,
            border: '14px solid #f97316',
            boxShadow: '0 0 40px #fbbf24',
            opacity: 0.4,
          }}
        />

        {/* Snowball */}
        <div
          style={{
            position: 'absolute',
            top: 180,
            left: 200,
            width: 40,
            height: 40,
            borderRadius: 20,
            background: '#f0f9ff',
            boxShadow: '0 0 20px #bae6fd',
            opacity: 0.6,
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
            borderTop: '3px solid #bae6fd',
            borderLeft: '3px solid #bae6fd',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '3px solid #bae6fd',
            borderRight: '3px solid #bae6fd',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #f97316',
            borderLeft: '3px solid #f97316',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #f97316',
            borderRight: '3px solid #f97316',
          }}
        />

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: won ? '#f97316' : '#bae6fd',
            letterSpacing: 12,
            textShadow: won ? '0 0 40px #fbbf24' : '0 0 40px #bae6fd99',
            marginBottom: 20,
          }}
        >
          MELT
        </div>

        {/* Big score */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 700,
            color: '#f0f9ff',
            textShadow: '0 0 80px #bae6fdcc, 0 20px 60px #f9731680',
            lineHeight: 1,
          }}
        >
          {layers}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 28,
            color: '#bae6fd',
            letterSpacing: 4,
            marginTop: 10,
          }}
        >
          LAYERS DESCENDED
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 24,
            color: won ? '#fbbf24' : '#f97316',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          {tagline}
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#f0f9ff',
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
