import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SNIP - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
        {/* Grid */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0 100px', opacity: 0.05 }}>
          {[...Array(8)].map((_, i) => (<div key={i} style={{ width: '100%', height: 1, background: '#a3e635' }} />))}
        </div>

        {/* Ribbon - curved gold band */}
        <div style={{ position: 'absolute', top: 60, left: 500, width: 50, height: 200, background: '#facc15', borderRadius: 25, opacity: 0.85, boxShadow: '0 0 20px #facc1540', transform: 'rotate(15deg)' }} />
        <div style={{ position: 'absolute', top: 220, left: 520, width: 45, height: 180, background: '#facc15', borderRadius: 22, opacity: 0.85, boxShadow: '0 0 20px #facc1540', transform: 'rotate(-10deg)' }} />
        <div style={{ position: 'absolute', top: 370, left: 490, width: 40, height: 160, background: '#facc15', borderRadius: 20, opacity: 0.85, boxShadow: '0 0 20px #facc1540', transform: 'rotate(8deg)' }} />

        {/* Cut trail */}
        <div style={{ position: 'absolute', top: 80, left: 523, width: 2, height: 150, background: '#333333', transform: 'rotate(15deg)' }} />
        <div style={{ position: 'absolute', top: 240, left: 540, width: 2, height: 130, background: '#333333', transform: 'rotate(-10deg)' }} />

        {/* Scissors */}
        <div style={{ position: 'absolute', top: 350, left: 505, fontSize: 40, transform: 'rotate(90deg)' }}>
          <div style={{ width: 28, height: 28, borderLeft: '4px solid #a3e635', borderBottom: '4px solid #a3e635', transform: 'rotate(-45deg)', boxShadow: '0 0 15px #a3e63580' }} />
        </div>

        {/* Title */}
        <div style={{ fontSize: 140, fontWeight: 700, color: '#a3e635', letterSpacing: 20, textShadow: '0 0 60px #a3e63580', marginBottom: 10 }}>
          SNIP
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 28, color: '#facc15', letterSpacing: 8, marginBottom: 40 }}>
          CUT THE RIBBON
        </div>

        {/* Branding */}
        <div style={{ position: 'absolute', bottom: 40, fontSize: 24, color: '#ffffff', letterSpacing: 6, opacity: 0.6 }}>
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
