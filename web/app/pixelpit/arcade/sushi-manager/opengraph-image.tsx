import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'SUSHI MANAGER - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        <CornerAccents color="#FF8C00" />

        <div
          style={{
            fontSize: 80,
            marginBottom: 20,
          }}
        >
          🍣
        </div>

        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#FFD700',
            letterSpacing: 6,
            marginBottom: 16,
            textShadow: '0 0 40px #FFD70080',
          }}
        >
          SUSHI MANAGER
        </div>

        <div
          style={{
            fontSize: 22,
            color: '#D4A574',
            letterSpacing: 4,
          }}
        >
          SERVE - CLEAN - SURVIVE THE RUSH
        </div>

        <PixelpitBranding color="#71717a" />
      </div>
    ),
    { ...size }
  );
}
