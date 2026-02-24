import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PAVE - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f8fafc',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ghost platforms */}
        <div style={{ position: 'absolute', top: 150, left: 200, width: 80, height: 14, background: '#e2e8f0', opacity: 0.3 }} />
        <div style={{ position: 'absolute', top: 250, right: 250, width: 70, height: 14, background: '#e2e8f0', opacity: 0.25 }} />
        <div style={{ position: 'absolute', bottom: 200, left: 320, width: 90, height: 14, background: '#e2e8f0', opacity: 0.35 }} />

        {/* Solid platforms */}
        <div style={{ position: 'absolute', top: 320, left: 450, width: 80, height: 14, background: '#a3e635', border: '2px solid #65a30d' }} />

        {/* Dots */}
        <div style={{ position: 'absolute', top: 180, right: 380, width: 16, height: 16, borderRadius: 9999, background: '#22d3ee' }} />

        {/* Player */}
        <div style={{ width: 32, height: 32, borderRadius: 9999, background: '#1e293b', marginBottom: 20 }} />

        {/* Title */}
        <div style={{ fontSize: 80, fontWeight: 700, color: '#1e293b', letterSpacing: 12, marginBottom: 10 }}>
          PAVE
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 28, color: '#94a3b8', letterSpacing: 6 }}>
          collect dots to build your path
        </div>

        {/* Branding */}
        <div style={{ position: 'absolute', bottom: 40, fontSize: 22, color: '#94a3b8', letterSpacing: 6, opacity: 0.6 }}>
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #a3e635', borderLeft: '3px solid #a3e635' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #a3e635', borderRight: '3px solid #a3e635' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #a3e635', borderLeft: '3px solid #a3e635' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #a3e635', borderRight: '3px solid #a3e635' }} />
      </div>
    ),
    { ...size }
  );
}
