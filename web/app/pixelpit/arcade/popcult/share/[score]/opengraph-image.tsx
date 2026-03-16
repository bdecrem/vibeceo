import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'POP CULT Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#e8e4dc',
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
        <CornerAccents color="#e74c3c" />

        {/* Game name */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#222222',
            letterSpacing: 6,
            marginBottom: 20,
          }}
        >
          POP CULT
        </div>

        {/* Score */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 200,
            color: '#222222',
            lineHeight: 1,
          }}
        >
          {score}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: '#ff3366',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          CAN YOU BREAK MORE?
        </div>

        <PixelpitBranding color="#888888" />
      </div>
    ),
    { ...size }
  );
}
