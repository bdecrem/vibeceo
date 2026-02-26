import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GLINT Score Share';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: Promise<{ score: string }> }) {
  const { score } = await params;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#09090b', fontFamily: 'monospace' }}>
        {/* Decorative color lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', opacity: 0.12 }}>
          <div style={{ position: 'absolute', top: 60, left: 180, width: 2, height: 280, background: '#ef4444', transform: 'rotate(12deg)' }} />
          <div style={{ position: 'absolute', top: 100, right: 220, width: 2, height: 220, background: '#3b82f6', transform: 'rotate(-8deg)' }} />
          <div style={{ position: 'absolute', bottom: 100, left: 400, width: 2, height: 200, background: '#22c55e', transform: 'rotate(18deg)' }} />
        </div>
        <div style={{ fontSize: 20, color: '#71717a', letterSpacing: 4, marginBottom: 16 }}>ABSORBED</div>
        <div style={{ fontSize: 140, fontWeight: 700, color: '#ffffff', letterSpacing: 8, marginBottom: 12 }}>{score}</div>
        <div style={{ fontSize: 22, color: '#71717a', letterSpacing: 3, marginBottom: 40 }}>points scored on GLINT</div>
        {/* Prism icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, marginBottom: 16 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 20h20L12 2z" fill="none" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M12 8L8 16h8L12 8z" fill="#ffffff" fillOpacity="0.2" />
          </svg>
        </div>
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
