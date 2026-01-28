import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BOOST - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
        <div
          style={{
            fontSize: 100,
            fontWeight: 700,
            color: '#fbbf24',
            letterSpacing: 20,
            textShadow: '0 0 60px #fbbf2480',
          }}
        >
          BOOST
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#22d3ee',
            letterSpacing: 8,
            marginTop: 20,
          }}
        >
          RACE THROUGH GATES
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 18,
            color: '#f8fafc',
            letterSpacing: 6,
            opacity: 0.6,
          }}
        >
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}