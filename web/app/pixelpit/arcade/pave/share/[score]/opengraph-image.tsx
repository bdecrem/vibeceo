import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PAVE Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

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
        <div style={{ position: 'absolute', top: 120, left: 180, width: 80, height: 14, background: '#e2e8f0', opacity: 0.4 }} />
        <div style={{ position: 'absolute', top: 200, right: 220, width: 70, height: 14, background: '#e2e8f0', opacity: 0.3 }} />
        <div style={{ position: 'absolute', bottom: 180, left: 280, width: 90, height: 14, background: '#e2e8f0', opacity: 0.35 }} />

        {/* Solid platforms */}
        <div style={{ position: 'absolute', top: 280, left: 400, width: 80, height: 14, background: '#a3e635', border: '2px solid #65a30d' }} />
        <div style={{ position: 'absolute', bottom: 140, right: 350, width: 70, height: 14, background: '#a3e635', border: '2px solid #65a30d' }} />

        {/* Dots */}
        <div style={{ position: 'absolute', top: 160, left: 500, width: 16, height: 16, borderRadius: 9999, background: '#22d3ee', opacity: 0.8 }} />
        <div style={{ position: 'absolute', bottom: 220, right: 400, width: 14, height: 14, borderRadius: 9999, background: '#22d3ee', opacity: 0.7 }} />

        {/* Player */}
        <div style={{ position: 'absolute', top: 240, left: 570, width: 24, height: 24, borderRadius: 9999, background: '#1e293b' }} />

        {/* Score */}
        <div style={{ fontSize: 160, fontWeight: 700, color: '#1e293b', letterSpacing: 8, lineHeight: 1, marginBottom: 10 }}>
          {score}
        </div>

        {/* Game name */}
        <div style={{ fontSize: 48, fontWeight: 700, color: '#a3e635', letterSpacing: 12, marginBottom: 15 }}>
          PAVE
        </div>

        {/* Challenge */}
        <div style={{ fontSize: 28, color: '#22d3ee', letterSpacing: 8 }}>
          CAN YOU CLIMB HIGHER?
        </div>

        {/* Branding */}
        <div style={{ position: 'absolute', bottom: 40, fontSize: 22, color: '#94a3b8', letterSpacing: 6 }}>
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
