import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SWARM - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #e0f2fe 0%, #f0fdf4 50%, #86efac 100%)',
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
        {/* Flowers decoration */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 150,
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
            right: 200,
            width: 50,
            height: 50,
            borderRadius: 25,
            background: '#22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            left: 200,
            width: 55,
            height: 55,
            borderRadius: 27,
            background: '#a78bfa',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 150,
            right: 180,
            width: 45,
            height: 45,
            borderRadius: 22,
            background: '#f472b6',
          }}
        />

        {/* Bee emoji */}
        <div style={{ fontSize: 120, marginBottom: 20 }}>🐝</div>

        {/* Game title */}
        <div
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: '#1e293b',
            letterSpacing: 8,
          }}
        >
          SWARM
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#71717a',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          AIM • MULTIPLY • OVERWHELM
        </div>

        {/* Multiplier badges */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 30,
          }}
        >
          <div
            style={{
              background: '#f472b6',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 20,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            ×2
          </div>
          <div
            style={{
              background: '#22d3ee',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 20,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            ×3
          </div>
          <div
            style={{
              background: '#a78bfa',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 20,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            ×5
          </div>
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#1e293b',
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
