import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'LEVEL Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const seconds = (parseInt(params.score) / 10).toFixed(1);

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
        <CornerAccents color="#FFD700" />

        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#FFD700',
            letterSpacing: 6,
            marginBottom: 20,
          }}
        >
          LEVEL
        </div>

        <div
          style={{
            fontSize: 140,
            fontWeight: 200,
            color: '#FFD700',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          {seconds}
          <span style={{ fontSize: 48, color: '#D4A574', marginLeft: 8 }}>s</span>
        </div>

        <div
          style={{
            fontSize: 24,
            color: '#7B68EE',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          CAN YOU STAY CENTERED?
        </div>

        <PixelpitBranding color="#71717a" />
      </div>
    ),
    { ...size }
  );
}
