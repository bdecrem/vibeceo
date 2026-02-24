import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FLING – PixelPit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#09090b', fontFamily: 'monospace' }}>
        {/* Silk strands */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', opacity: 0.15 }}>
          <div style={{ position: 'absolute', top: 40, left: 300, width: 1, height: 350, background: '#ffffff' }} />
          <div style={{ position: 'absolute', top: 80, right: 280, width: 1, height: 280, background: '#ffffff' }} />
          <div style={{ position: 'absolute', top: 60, left: 600, width: 1, height: 300, background: '#ffffff' }} />
        </div>
        {/* Spider */}
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', marginBottom: 20, border: '3px solid #71717a' }} />
        <div style={{ fontSize: 96, fontWeight: 700, color: '#ffffff', letterSpacing: 12, marginBottom: 16 }}>FLING</div>
        <div style={{ fontSize: 20, color: '#71717a', letterSpacing: 4, marginBottom: 40 }}>tap to fling · catch bugs mid-air</div>
        {/* Bug dots */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a3e635' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f472b6' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#facc15' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 16, color: '#a3e635', letterSpacing: 3 }}>pixel</div>
          <div style={{ fontSize: 16, color: '#22d3ee', letterSpacing: 3 }}>pit</div>
          <div style={{ fontSize: 16, color: '#71717a', letterSpacing: 3 }}>arcade</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
