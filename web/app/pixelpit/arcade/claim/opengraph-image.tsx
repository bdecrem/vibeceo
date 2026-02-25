import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CLAIM – PixelPit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#09090b', fontFamily: 'monospace' }}>
        {/* Territory glow lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', opacity: 0.15 }}>
          <div style={{ position: 'absolute', top: 80, left: 200, width: 120, height: 120, background: '#92400e', transform: 'rotate(15deg)' }} />
          <div style={{ position: 'absolute', bottom: 120, right: 180, width: 80, height: 80, background: '#92400e', transform: 'rotate(-20deg)' }} />
          <div style={{ position: 'absolute', top: 200, right: 350, width: 60, height: 60, background: '#facc15', opacity: 0.3 }} />
        </div>
        {/* Firefly */}
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#facc15', marginBottom: 20, border: '3px solid #ffffff' }} />
        <div style={{ fontSize: 96, fontWeight: 700, color: '#ffffff', letterSpacing: 12, marginBottom: 16 }}>CLAIM</div>
        <div style={{ fontSize: 20, color: '#71717a', letterSpacing: 4, marginBottom: 40 }}>swipe to steer · loop to claim · light the meadow</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 16, color: '#a3e635', letterSpacing: 3 }}>pixel</div>
          <div style={{ fontSize: 16, color: '#facc15', letterSpacing: 3 }}>pit</div>
          <div style={{ fontSize: 16, color: '#71717a', letterSpacing: 3 }}>arcade</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
