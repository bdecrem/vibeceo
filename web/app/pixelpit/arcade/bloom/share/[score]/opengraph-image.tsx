import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BLOOM Score Share';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: Promise<{ score: string }> }) {
  const { score } = await params;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: 'monospace' }}>
        {/* Decorative lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', opacity: 0.12 }}>
          <div style={{ position: 'absolute', top: 60, left: 180, width: 2, height: 280, background: '#22c55e', transform: 'rotate(12deg)' }} />
          <div style={{ position: 'absolute', top: 100, right: 220, width: 2, height: 220, background: '#ef4444', transform: 'rotate(-8deg)' }} />
        </div>
        <div style={{ fontSize: 20, color: '#ef4444', letterSpacing: 4, marginBottom: 16 }}>WILTED</div>
        <div style={{ fontSize: 140, fontWeight: 700, color: '#1e293b', letterSpacing: 8, marginBottom: 12 }}>{score}</div>
        <div style={{ fontSize: 22, color: '#94a3b8', letterSpacing: 3, marginBottom: 40 }}>points scored on BLOOM</div>
        {/* Seed icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, marginBottom: 16 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#22c55e', border: '2px solid #15803d' }} />
        </div>
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
