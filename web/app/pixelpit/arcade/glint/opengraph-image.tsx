import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GLINT – PixelPit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#09090b', fontFamily: 'monospace' }}>
        {/* Decorative color lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', opacity: 0.15 }}>
          <div style={{ position: 'absolute', top: 80, left: 200, width: 3, height: 250, background: '#ef4444', transform: 'rotate(20deg)' }} />
          <div style={{ position: 'absolute', top: 60, left: 350, width: 2, height: 280, background: '#3b82f6', transform: 'rotate(-12deg)' }} />
          <div style={{ position: 'absolute', top: 100, right: 300, width: 3, height: 220, background: '#22c55e', transform: 'rotate(15deg)' }} />
          <div style={{ position: 'absolute', bottom: 80, right: 200, width: 2, height: 200, background: '#facc15', transform: 'rotate(-8deg)' }} />
        </div>
        {/* Prism icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, marginBottom: 20 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 20h20L12 2z" fill="none" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M12 8L8 16h8L12 8z" fill="#ffffff" fillOpacity="0.2" />
          </svg>
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, color: '#ffffff', letterSpacing: 12, marginBottom: 16 }}>GLINT</div>
        <div style={{ fontSize: 20, color: '#71717a', letterSpacing: 4, marginBottom: 40 }}>aim · bounce · refract</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 16, color: '#ffffff', letterSpacing: 3 }}>pixel</div>
          <div style={{ fontSize: 16, color: '#facc15', letterSpacing: 3 }}>pit</div>
          <div style={{ fontSize: 16, color: '#71717a', letterSpacing: 3 }}>arcade</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
