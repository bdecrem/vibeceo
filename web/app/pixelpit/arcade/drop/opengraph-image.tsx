import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'DROP - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #87CEEB 0%, #4A8DB7 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <CornerAccents color="#FF2244" />

        {/* Game name */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: -2,
            textShadow: '0 4px 0 rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.08)',
            marginBottom: 20,
          }}
        >
          DROP
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: 4,
            fontWeight: 600,
          }}
        >
          fall through the gaps
        </div>

        <PixelpitBranding color="rgba(255,255,255,0.5)" />
      </div>
    ),
    { ...size }
  );
}
