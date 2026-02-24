import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DASH – PixelPit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#09090b', fontFamily: 'monospace' }}>
        {/* Nerve lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', opacity: 0.15 }}>
          <div style={{ position: 'absolute', top: 80, left: 200, width: 2, height: 300, background: '#27272a', transform: 'rotate(15deg)' }} />
          <div style={{ position: 'absolute', top: 120, right: 250, width: 2, height: 250, background: '#27272a', transform: 'rotate(-10deg)' }} />
          <div style={{ position: 'absolute', bottom: 100, left: 400, width: 2, height: 200, background: '#27272a', transform: 'rotate(25deg)' }} />
        </div>
        {/* Cyan spark */}
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#22d3ee', marginBottom: 20, border: '3px solid #ffffff' }} />
        <div style={{ fontSize: 96, fontWeight: 700, color: '#ffffff', letterSpacing: 12, marginBottom: 16 }}>DASH</div>
        <div style={{ fontSize: 20, color: '#71717a', letterSpacing: 4, marginBottom: 40 }}>tap to hop · dodge signals · collect ions</div>
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
