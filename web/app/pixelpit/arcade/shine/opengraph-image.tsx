import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SHINE - Pixelpit Arcade';
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
        {/* Warm ambient bands */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, #D4A57415, #00000000, #2D959615)', display: 'flex' }} />

        {/* Gem icon */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 9999,
            background: 'linear-gradient(135deg, #FFD700, #D4A574)',
            marginBottom: 30,
            display: 'flex',
          }}
        />

        {/* Game name */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#FFD700',
            letterSpacing: 20,
            lineHeight: 1,
            marginBottom: 15,
          }}
        >
          SHINE
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#D4A574',
            letterSpacing: 10,
          }}
        >
          COLLECT THE GLOW
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 22,
            color: '#ffffff',
            letterSpacing: 6,
            opacity: 0.5,
            display: 'flex',
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #FFD700', borderLeft: '3px solid #FFD700', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #FFD700', borderRight: '3px solid #FFD700', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #FFD700', borderLeft: '3px solid #FFD700', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #FFD700', borderRight: '3px solid #FFD700', display: 'flex' }} />
      </div>
    ),
    { ...size }
  );
}
