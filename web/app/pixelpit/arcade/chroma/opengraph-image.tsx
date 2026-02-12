import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CHROMA - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #22c55e 0%, #166534 100%)',
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
        {/* Decorative vines */}
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 0,
            bottom: 0,
            width: 8,
            background: '#15803d',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 100,
            top: 0,
            bottom: 0,
            width: 8,
            background: '#15803d',
          }}
        />

        {/* Color circles - obstacles representation */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 200,
            width: 60,
            height: 60,
            borderRadius: 30,
            background: '#f472b6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 180,
            right: 250,
            width: 50,
            height: 50,
            borderRadius: 25,
            background: '#22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            left: 250,
            width: 55,
            height: 55,
            borderRadius: 27,
            background: '#facc15',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            right: 200,
            width: 45,
            height: 45,
            borderRadius: 22,
            background: '#a78bfa',
          }}
        />

        {/* Chameleon emoji */}
        <div style={{ fontSize: 120, marginBottom: 20 }}>🦎</div>

        {/* Game title */}
        <div
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: 8,
            textShadow: '0 4px 0 #166534',
          }}
        >
          CHROMA
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#86efac',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          TAP • MATCH • CLIMB
        </div>

        {/* Color bar */}
        <div
          style={{
            display: 'flex',
            gap: 15,
            marginTop: 30,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              background: '#f472b6',
              border: '4px solid #ffffff',
            }}
          />
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              background: '#22d3ee',
              border: '4px solid #ffffff',
            }}
          />
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              background: '#facc15',
              border: '4px solid #ffffff',
            }}
          />
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              background: '#a78bfa',
              border: '4px solid #ffffff',
            }}
          />
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
