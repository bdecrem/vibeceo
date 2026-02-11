import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SWOOP CI - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #87CEEB 0%, #f0f9ff 100%)',
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
        {/* Clouds */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 80,
            width: 150,
            height: 75,
            borderRadius: 75,
            background: '#ffffff',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 100,
            right: 120,
            width: 120,
            height: 60,
            borderRadius: 60,
            background: '#ffffff',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            left: 200,
            width: 100,
            height: 50,
            borderRadius: 50,
            background: '#ffffff',
          }}
        />

        {/* Loop hoops */}
        <div
          style={{
            position: 'absolute',
            top: 180,
            left: 150,
            width: 100,
            height: 100,
            borderRadius: 50,
            border: '8px solid #18181b',
            background: '#00000000',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 220,
            right: 200,
            width: 80,
            height: 80,
            borderRadius: 40,
            border: '6px solid #18181b',
            background: '#00000000',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            right: 300,
            width: 90,
            height: 90,
            borderRadius: 45,
            border: '6px solid #d946ef',
            background: '#00000000',
          }}
        />

        {/* Bird */}
        <div
          style={{
            position: 'absolute',
            top: 250,
            left: 500,
            width: 60,
            height: 60,
            borderRadius: 30,
            background: '#facc15',
            border: '4px solid #18181b',
          }}
        />

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
          SWOOP CI
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#f97316',
            marginTop: 15,
            letterSpacing: 4,
            zIndex: 10,
          }}
        >
          HOLD TO BOOST • RELEASE TO DIVE
        </div>

        {/* Flying through loops indicator */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 30,
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 50 }}>🐦</div>
          <div style={{ fontSize: 24, color: '#22d3ee' }}>→</div>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              border: '4px solid #22d3ee',
            }}
          />
          <div style={{ fontSize: 24, color: '#22d3ee' }}>→</div>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              border: '4px solid #d946ef',
            }}
          />
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
