import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PHASE Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
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
        {/* Gear outlines */}
        <div style={{ position: 'absolute', top: 100, left: 200, width: 100, height: 100, borderRadius: 9999, border: '3px solid #2a2a2e' }} />
        <div style={{ position: 'absolute', top: 150, right: 250, width: 80, height: 80, borderRadius: 9999, border: '3px solid #2a2a2e' }} />
        <div style={{ position: 'absolute', bottom: 150, left: 300, width: 90, height: 90, borderRadius: 9999, border: '3px solid #2a2a2e' }} />

        {/* Color segments */}
        <div style={{ position: 'absolute', top: 130, left: 230, width: 40, height: 20, background: '#22d3ee', borderRadius: 9999, opacity: 0.5, boxShadow: '0 0 15px #22d3ee40' }} />
        <div style={{ position: 'absolute', top: 175, right: 270, width: 35, height: 18, background: '#d946ef', borderRadius: 9999, opacity: 0.5, boxShadow: '0 0 15px #d946ef40' }} />
        <div style={{ position: 'absolute', bottom: 175, left: 325, width: 38, height: 19, background: '#facc15', borderRadius: 9999, opacity: 0.5, boxShadow: '0 0 15px #facc1540' }} />

        {/* Ghost */}
        <div style={{ width: 36, height: 36, borderRadius: 9999, background: '#ffffff', boxShadow: '0 0 40px #22d3ee80', marginBottom: 20 }} />

        {/* Score */}
        <div style={{ fontSize: 160, fontWeight: 700, color: '#22d3ee', letterSpacing: 10, textShadow: '0 0 80px #22d3ee60', lineHeight: 1, marginBottom: 10 }}>
          {score}
        </div>

        {/* Game name */}
        <div style={{ fontSize: 48, fontWeight: 600, color: '#ffffff', letterSpacing: 12, opacity: 0.9, marginBottom: 15 }}>
          PHASE
        </div>

        {/* Challenge */}
        <div style={{ fontSize: 28, color: '#d946ef', letterSpacing: 8 }}>
          CAN YOU PHASE FURTHER?
        </div>

        {/* Branding */}
        <div style={{ position: 'absolute', bottom: 40, fontSize: 22, color: '#ffffff', letterSpacing: 6, opacity: 0.5 }}>
          PIXELPIT ARCADE
        </div>

        {/* Corners */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #facc15', borderLeft: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #facc15', borderRight: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #facc15', borderLeft: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #facc15', borderRight: '3px solid #facc15' }} />
      </div>
    ),
    { ...size }
  );
}
