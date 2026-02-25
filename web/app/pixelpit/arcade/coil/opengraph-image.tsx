import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'COIL – PixelPit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#09090b', fontFamily: 'monospace' }}>
        {/* Lightning lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', opacity: 0.15 }}>
          <div style={{ position: 'absolute', top: 60, left: 200, width: 3, height: 300, background: '#7c3aed', transform: 'rotate(15deg)' }} />
          <div style={{ position: 'absolute', top: 100, right: 220, width: 2, height: 250, background: '#7c3aed', transform: 'rotate(-10deg)' }} />
          <div style={{ position: 'absolute', bottom: 80, left: 450, width: 2, height: 200, background: '#22d3ee', transform: 'rotate(25deg)' }} />
        </div>
        {/* Lightning bolt */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, marginBottom: 20 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#22d3ee" />
          </svg>
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, color: '#ffffff', letterSpacing: 12, marginBottom: 16 }}>COIL</div>
        <div style={{ fontSize: 20, color: '#71717a', letterSpacing: 4, marginBottom: 40 }}>tap to arc · hold to boost</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 16, color: '#22d3ee', letterSpacing: 3 }}>pixel</div>
          <div style={{ fontSize: 16, color: '#facc15', letterSpacing: 3 }}>pit</div>
          <div style={{ fontSize: 16, color: '#71717a', letterSpacing: 3 }}>arcade</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
