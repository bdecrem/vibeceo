import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SLIDE - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #fdf4ff 0%, #fce7f3 100%)',
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
        {/* Sun */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 100,
            width: 100,
            height: 100,
            borderRadius: 50,
            background: '#fbbf24',
          }}
        />

        {/* Snow hills */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: -100,
            width: 500,
            height: 250,
            background: '#f8fafc',
            borderRadius: '9999px 9999px 0 0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 300,
            width: 400,
            height: 200,
            background: '#f1f5f9',
            borderRadius: '9999px 9999px 0 0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: -50,
            width: 450,
            height: 280,
            background: '#f8fafc',
            borderRadius: '9999px 9999px 0 0',
          }}
        />

        {/* Penguin on hill */}
        <div
          style={{
            position: 'absolute',
            bottom: 220,
            left: 350,
            fontSize: 60,
            transform: 'rotate(-15deg)',
          }}
        >
          🐧
        </div>

        {/* Game title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#18181b',
            letterSpacing: 8,
            zIndex: 10,
          }}
        >
          SLIDE
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#f472b6',
            marginTop: 15,
            letterSpacing: 4,
            zIndex: 10,
          }}
        >
          HOLD TO DIVE • RELEASE TO SOAR
        </div>

        {/* Sunset race indicator */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 30,
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 30 }}>☀️</div>
          <div
            style={{
              width: 200,
              height: 12,
              background: '#18181b20',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: 140,
                height: 12,
                background: 'linear-gradient(90deg, #f472b6, #facc15)',
                borderRadius: 6,
              }}
            />
          </div>
          <div style={{ fontSize: 30 }}>🌙</div>
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
