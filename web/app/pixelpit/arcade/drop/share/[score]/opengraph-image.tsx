import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'DROP Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

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
            fontSize: 36,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: 6,
            marginBottom: 20,
            textShadow: '0 2px 0 rgba(0,0,0,0.1)',
          }}
        >
          DROP
        </div>

        {/* Score */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1,
            textShadow: '0 4px 0 rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.08)',
          }}
        >
          {score}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: '#FF2244',
            letterSpacing: 4,
            marginTop: 20,
            fontWeight: 800,
          }}
        >
          CAN YOU BEAT ME?
        </div>

        <PixelpitBranding color="rgba(255,255,255,0.5)" />
      </div>
    ),
    { ...size }
  );
}
