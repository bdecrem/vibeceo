import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'POP CULT - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
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

        {/* Decorative balls */}
        <div style={{ position: 'absolute', display: 'flex', gap: 20, top: 80, left: 100 }}>
          {['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'].map((c, i) => (
            <div key={i} style={{ width: 40, height: 40, borderRadius: 9999, background: c, opacity: 0.6 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', display: 'flex', gap: 20, bottom: 100, right: 100 }}>
          {['#9b59b6', '#f39c12', '#2ecc71', '#3498db', '#e74c3c'].map((c, i) => (
            <div key={i} style={{ width: 40, height: 40, borderRadius: 9999, background: c, opacity: 0.6 }} />
          ))}
        </div>

        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#222222',
            letterSpacing: 8,
          }}
        >
          POP CULT
        </div>

        <div
          style={{
            fontSize: 28,
            color: '#ff3366',
            letterSpacing: 4,
            marginTop: 12,
          }}
        >
          POP BALLS. JOIN THE CULT.
        </div>

        <PixelpitBranding color="#888888" />
      </div>
    ),
    { ...size }
  );
}
