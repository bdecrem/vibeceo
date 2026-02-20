import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SNIP Score - Pixelpit Arcade';
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
        {/* Ribbon fragments */}
        <div style={{ position: 'absolute', top: 80, left: 350, width: 40, height: 120, background: '#facc15', borderRadius: 20, opacity: 0.6, transform: 'rotate(12deg)' }} />
        <div style={{ position: 'absolute', bottom: 120, right: 300, width: 35, height: 100, background: '#facc15', borderRadius: 18, opacity: 0.6, transform: 'rotate(-8deg)' }} />

        {/* Scissors icon */}
        <div style={{ width: 28, height: 28, borderLeft: '4px solid #a3e635', borderBottom: '4px solid #a3e635', transform: 'rotate(-45deg)', boxShadow: '0 0 20px #a3e63580', marginBottom: 25 }} />

        {/* Score */}
        <div style={{ fontSize: 160, fontWeight: 700, color: '#a3e635', letterSpacing: 10, textShadow: '0 0 80px #a3e63560', lineHeight: 1, marginBottom: 10 }}>
          {score}
        </div>

        {/* Game name */}
        <div style={{ fontSize: 48, fontWeight: 600, color: '#facc15', letterSpacing: 12, marginBottom: 15 }}>
          SNIP
        </div>

        {/* Challenge */}
        <div style={{ fontSize: 28, color: '#ffffff', letterSpacing: 8, opacity: 0.8 }}>
          CAN YOU CUT FURTHER?
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
