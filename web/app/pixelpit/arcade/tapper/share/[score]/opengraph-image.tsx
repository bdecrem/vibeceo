import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'TAPPER Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#09090b',
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
        <CornerAccents color="#22d3ee" />

        {/* Game name */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#22d3ee',
            letterSpacing: 6,
            marginBottom: 20,
          }}
        >
          TAPPER
        </div>

        {/* Score */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 200,
            color: '#22d3ee',
            lineHeight: 1,
          }}
        >
          {score}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: '#a855f7',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          CAN YOU TAP FASTER?
        </div>

        <PixelpitBranding color="#71717a" />
      </div>
    ),
    { ...size }
  );
}
