import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MELT - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
        {/* Ice rings at top */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 300,
            width: 200,
            height: 200,
            borderRadius: 100,
            border: '20px solid #0ea5e9',
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 120,
            right: 280,
            width: 150,
            height: 150,
            borderRadius: 75,
            border: '15px solid #0ea5e9',
            opacity: 0.3,
          }}
        />

        {/* Lava rings at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 250,
            width: 180,
            height: 180,
            borderRadius: 90,
            border: '18px solid #f97316',
            boxShadow: '0 0 40px #fbbf24',
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            right: 300,
            width: 140,
            height: 140,
            borderRadius: 70,
            border: '14px solid #f97316',
            boxShadow: '0 0 30px #fbbf24',
            opacity: 0.4,
          }}
        />

        {/* Snowball */}
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 550,
            width: 60,
            height: 60,
            borderRadius: 30,
            background: '#f0f9ff',
            boxShadow: '0 0 30px #bae6fd',
          }}
        />

        {/* Game title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            color: '#f0f9ff',
            textShadow: '0 0 60px #bae6fd, 0 10px 40px #f97316',
            letterSpacing: 12,
          }}
        >
          MELT
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#bae6fd',
            marginTop: 15,
            letterSpacing: 4,
          }}
        >
          you are a snowball
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: 22,
            color: '#f97316',
            marginTop: 10,
          }}
        >
          you want to reach hell
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#f0f9ff',
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
