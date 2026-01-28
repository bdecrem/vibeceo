import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SINGULARITY - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#000000',
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
        {/* Singularity glow at top */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: 400,
            width: 400,
            height: 300,
            background: 'linear-gradient(180deg, #ff4d0066 0%, #33110033 50%, #00000000 100%)',
            borderRadius: 200,
          }}
        />

        {/* Grid lines - horizontal */}
        <div style={{ position: 'absolute', top: 80, left: 0, right: 0, height: 1, background: '#1a0800' }} />
        <div style={{ position: 'absolute', top: 160, left: 0, right: 0, height: 1, background: '#1a0800' }} />
        <div style={{ position: 'absolute', top: 470, left: 0, right: 0, height: 1, background: '#1a0800' }} />
        <div style={{ position: 'absolute', top: 550, left: 0, right: 0, height: 1, background: '#1a0800' }} />

        {/* Grid lines - vertical */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 200, width: 1, background: '#1a0800' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 400, width: 1, background: '#1a0800' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 800, width: 1, background: '#1a0800' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 1000, width: 1, background: '#1a0800' }} />

        {/* Falling particles */}
        <div
          style={{
            position: 'absolute',
            left: 250,
            top: 100,
            width: 10,
            height: 10,
            borderRadius: 5,
            background: '#ff4d00',
            boxShadow: '0 0 15px #ff4d00',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 500,
            top: 80,
            width: 14,
            height: 14,
            borderRadius: 7,
            background: '#ff4d00',
            boxShadow: '0 0 15px #ff4d00',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 700,
            top: 120,
            width: 8,
            height: 8,
            borderRadius: 4,
            background: '#ff4d00',
            boxShadow: '0 0 15px #ff4d00',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 900,
            top: 90,
            width: 12,
            height: 12,
            borderRadius: 6,
            background: '#ff4d00',
            boxShadow: '0 0 15px #ff4d00',
          }}
        />

        {/* Containment paddle */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 500,
            width: 200,
            height: 12,
            background: '#ff4d00',
            boxShadow: '0 0 30px #ff4d00',
          }}
        />

        {/* Main title */}
        <div
          style={{
            fontSize: 100,
            fontWeight: 700,
            color: '#ff4d00',
            letterSpacing: 20,
            textShadow: '0 0 60px #ff4d00cc',
            marginBottom: 20,
          }}
        >
          SINGULARITY
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: '#ff4d00',
            letterSpacing: 12,
            opacity: 0.7,
            marginBottom: 20,
          }}
        >
          PROTOCOL
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 20,
            color: '#662200',
            letterSpacing: 6,
          }}
        >
          CONTAIN THE BREACH
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 18,
            color: '#ff4d00',
            letterSpacing: 6,
            opacity: 0.5,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 25, left: 25, width: 35, height: 35, borderTop: '2px solid #ff4d00', borderLeft: '2px solid #ff4d00' }} />
        <div style={{ position: 'absolute', top: 25, right: 25, width: 35, height: 35, borderTop: '2px solid #ff4d00', borderRight: '2px solid #ff4d00' }} />
        <div style={{ position: 'absolute', bottom: 25, left: 25, width: 35, height: 35, borderBottom: '2px solid #ff4d00', borderLeft: '2px solid #ff4d00' }} />
        <div style={{ position: 'absolute', bottom: 25, right: 25, width: 35, height: 35, borderBottom: '2px solid #ff4d00', borderRight: '2px solid #ff4d00' }} />
      </div>
    ),
    { ...size }
  );
}
