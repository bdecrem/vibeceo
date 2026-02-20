import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SNIP - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
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
        }}
      >
        {/* Ribbon - vertical gold band */}
        <div style={{ position: 'absolute', top: 0, left: 560, width: 80, height: 630, background: '#facc15', opacity: 0.15, display: 'flex' }} />

        {/* Title */}
        <div style={{ display: 'flex', fontSize: 160, fontWeight: 700, color: '#a3e635', letterSpacing: 20 }}>
          SNIP
        </div>

        {/* Scissors icon - simple V */}
        <div style={{ display: 'flex', marginTop: 10, marginBottom: 20 }}>
          <div style={{ width: 4, height: 50, background: '#a3e635', marginRight: 12 }} />
          <div style={{ width: 4, height: 50, background: '#a3e635', marginLeft: 12 }} />
        </div>

        {/* Subtitle */}
        <div style={{ display: 'flex', fontSize: 32, color: '#facc15', letterSpacing: 10 }}>
          CUT THE RIBBON
        </div>

        {/* Branding */}
        <div style={{ position: 'absolute', bottom: 40, display: 'flex', fontSize: 22, color: '#ffffff', letterSpacing: 6, opacity: 0.5 }}>
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
