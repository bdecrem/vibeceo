import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BLOOM – PixelPit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: 'monospace' }}>
        {/* Decorative lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', opacity: 0.15 }}>
          <div style={{ position: 'absolute', top: 80, left: 200, width: 3, height: 280, background: '#22c55e', transform: 'rotate(15deg)' }} />
          <div style={{ position: 'absolute', top: 120, right: 220, width: 2, height: 220, background: '#22c55e', transform: 'rotate(-10deg)' }} />
          <div style={{ position: 'absolute', bottom: 80, left: 450, width: 2, height: 200, background: '#facc15', transform: 'rotate(25deg)' }} />
        </div>
        {/* Seed icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, marginBottom: 20 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#22c55e', border: '3px solid #15803d' }} />
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, color: '#1e293b', letterSpacing: 12, marginBottom: 16 }}>BLOOM</div>
        <div style={{ fontSize: 20, color: '#94a3b8', letterSpacing: 4, marginBottom: 40 }}>aim · multiply · crack the wall</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 16, color: '#22c55e', letterSpacing: 3 }}>pixel</div>
          <div style={{ fontSize: 16, color: '#facc15', letterSpacing: 3 }}>pit</div>
          <div style={{ fontSize: 16, color: '#94a3b8', letterSpacing: 3 }}>arcade</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
