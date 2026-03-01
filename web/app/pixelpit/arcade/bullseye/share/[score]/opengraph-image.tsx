import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'BULLSEYE Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
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

        {/* Target rings decoration */}
        <div style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: 9999,
          border: '3px solid #FFD70030',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 200,
            height: 200,
            borderRadius: 9999,
            border: '3px solid #FFD70050',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 100,
              height: 100,
              borderRadius: 9999,
              border: '3px solid #FFD70080',
              display: 'flex',
            }} />
          </div>
        </div>

        {/* Game name */}
        <div style={{
          fontSize: 36,
          fontWeight: 700,
          color: '#FFD700',
          letterSpacing: 6,
          marginBottom: 20,
          position: 'relative',
        }}>
          🎯 BULLSEYE
        </div>

        {/* Score */}
        <div style={{
          fontSize: 140,
          fontWeight: 700,
          color: '#FFD700',
          lineHeight: 1,
          position: 'relative',
        }}>
          {score}
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 24,
          color: '#2D9596',
          letterSpacing: 4,
          marginTop: 20,
          position: 'relative',
        }}>
          CAN YOU BEAT ME?
        </div>

        <PixelpitBranding color="#71717a" />
      </div>
    ),
    { ...size }
  );
}
