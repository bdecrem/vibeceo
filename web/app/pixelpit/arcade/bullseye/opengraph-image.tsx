import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'BULLSEYE - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
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
          width: 400,
          height: 400,
          borderRadius: 9999,
          border: '3px solid #FFD70020',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 280,
            height: 280,
            borderRadius: 9999,
            border: '3px solid #FFD70040',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 160,
              height: 160,
              borderRadius: 9999,
              border: '3px solid #FFD70060',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: 9999,
                background: '#FFD70080',
                display: 'flex',
              }} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 140,
          fontWeight: 700,
          color: '#FFD700',
          letterSpacing: 20,
          position: 'relative',
        }}>
          BULLSEYE
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 28,
          color: '#2D9596',
          letterSpacing: 6,
          marginTop: 10,
          position: 'relative',
        }}>
          TAP WHEN THE RING HITS THE CIRCLE
        </div>

        <PixelpitBranding color="#71717a" />
      </div>
    ),
    { ...size }
  );
}
