import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GLOP - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
        {/* Cauldron glow - solid fallback */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 200,
            width: 800,
            height: 200,
            background: '#a3e63520',
            borderRadius: '400px 400px 0 0',
          }}
        />

        {/* Cauldron shape */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 400,
            height: 300,
            background: '#18181b',
            borderRadius: '0 0 200px 200px',
          }}
        />

        {/* Slimes in cauldron */}
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 'calc(50% - 80px)',
            width: 50,
            height: 50,
            borderRadius: 25,
            background: '#22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 'calc(50% + 20px)',
            width: 60,
            height: 60,
            borderRadius: 30,
            background: '#a3e635',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 160,
            left: 'calc(50% - 30px)',
            width: 70,
            height: 70,
            borderRadius: 35,
            background: '#facc15',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 220,
            left: 'calc(50% - 50px)',
            width: 100,
            height: 100,
            borderRadius: 50,
            background: '#fbbf24',
            boxShadow: '0 0 30px #fbbf24',
          }}
        />

        {/* Game title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#a3e635',
            letterSpacing: 8,
            zIndex: 10,
            textShadow: '0 0 40px #a3e635',
            marginBottom: 200,
          }}
        >
          GLOP
        </div>

        {/* Tagline */}
        <div
          style={{
            position: 'absolute',
            top: 180,
            fontSize: 28,
            color: '#71717a',
            letterSpacing: 4,
            zIndex: 10,
          }}
        >
          DROP • MERGE • MAKE THE KING SLIME
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
