import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FLOWERCRAFT — Grow, Cross, Collect';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: 'linear-gradient(180deg, #0a1a0a 0%, #0a0a0a 50%, #1a1510 100%)',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}>
        <div style={{ display: 'flex', gap: 40, marginBottom: 40 }}>
          {['#e11d48', '#facc15', '#c084fc', '#f9fafb', '#f43f5e', '#f97316'].map((color, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 9999,
                background: color,
                boxShadow: `0 0 30px ${color}40`,
              }} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 90, fontWeight: 700, color: '#fde047', letterSpacing: 6 }}>
          FLOWERCRAFT
        </div>
        <div style={{ fontSize: 28, color: '#9ca3af', letterSpacing: 4, marginTop: 12 }}>
          GROW · CROSS · COLLECT
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 16, color: '#22c55e', letterSpacing: 3 }}>pixel</div>
          <div style={{ fontSize: 16, color: '#facc15', letterSpacing: 3 }}>pit</div>
          <div style={{ fontSize: 16, color: '#94a3b8', letterSpacing: 3 }}>arcade</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
