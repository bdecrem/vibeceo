import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DEVOUR - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
        {/* Black hole effect */}
        <div
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: 150,
            background: 'radial-gradient(circle at center, #000000 0%, #1a0a2e 50%, #8B5CF600 100%)',
            boxShadow: '0 0 100px 50px #8B5CF640',
          }}
        />

        {/* Accretion disk ring */}
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: 200,
            border: '8px solid #8B5CF680',
            boxShadow: '0 0 60px 20px #8B5CF640, inset 0 0 60px 20px #8B5CF620',
          }}
        />

        {/* Outer glow ring */}
        <div
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            borderRadius: 250,
            border: '4px solid #a78bfa40',
          }}
        />

        {/* Small debris */}
        <div
          style={{
            position: 'absolute',
            top: 120,
            right: 200,
            width: 20,
            height: 20,
            borderRadius: 10,
            background: '#22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 150,
            left: 180,
            width: 25,
            height: 25,
            borderRadius: 12,
            background: '#a78bfa',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 250,
            width: 15,
            height: 15,
            borderRadius: 7,
            background: '#fbbf24',
          }}
        />

        {/* Game title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#E5E7EB',
            textShadow: '0 0 60px #8B5CF6, 0 10px 40px #00000080',
            letterSpacing: 8,
            zIndex: 10,
          }}
        >
          DEVOUR
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#a78bfa',
            marginTop: 15,
            letterSpacing: 4,
            zIndex: 10,
          }}
        >
          DRAG TO HUNT • TAP TO DEVOUR
        </div>

        {/* VS indicator */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginTop: 30,
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: '#8B5CF6',
              boxShadow: '0 0 20px #8B5CF680',
            }}
          />
          <div style={{ fontSize: 24, color: '#6b7280' }}>VS</div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: '#ef4444',
              boxShadow: '0 0 20px #ef444480',
            }}
          />
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
