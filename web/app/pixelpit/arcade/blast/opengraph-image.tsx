import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BLAST - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#09090b',
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
        {/* Enemy formation - geometric shapes */}
        {/* Row 1 - triangles (pink) */}
        <div style={{ position: 'absolute', top: 80, left: 300, width: 0, height: 0, borderLeft: '20px solid #00000000', borderRight: '20px solid #00000000', borderBottom: '35px solid #f472b6' }} />
        <div style={{ position: 'absolute', top: 80, left: 420, width: 0, height: 0, borderLeft: '25px solid #00000000', borderRight: '25px solid #00000000', borderBottom: '40px solid #f472b6' }} />
        <div style={{ position: 'absolute', top: 80, left: 540, width: 0, height: 0, borderLeft: '20px solid #00000000', borderRight: '20px solid #00000000', borderBottom: '35px solid #f472b6' }} />
        <div style={{ position: 'absolute', top: 80, left: 660, width: 0, height: 0, borderLeft: '25px solid #00000000', borderRight: '25px solid #00000000', borderBottom: '40px solid #f472b6' }} />
        <div style={{ position: 'absolute', top: 80, left: 780, width: 0, height: 0, borderLeft: '20px solid #00000000', borderRight: '20px solid #00000000', borderBottom: '35px solid #f472b6' }} />
        
        {/* Row 2 - squares (purple) */}
        <div style={{ position: 'absolute', top: 140, left: 350, width: 35, height: 35, background: '#a78bfa', borderRadius: 4 }} />
        <div style={{ position: 'absolute', top: 140, left: 470, width: 40, height: 40, background: '#a78bfa', borderRadius: 4 }} />
        <div style={{ position: 'absolute', top: 140, left: 590, width: 35, height: 35, background: '#a78bfa', borderRadius: 4 }} />
        <div style={{ position: 'absolute', top: 140, left: 710, width: 40, height: 40, background: '#a78bfa', borderRadius: 4 }} />
        
        {/* Row 3 - hexagons (yellow) */}
        <div style={{ position: 'absolute', top: 200, left: 400, width: 32, height: 32, background: '#facc15', borderRadius: 8 }} />
        <div style={{ position: 'absolute', top: 200, left: 530, width: 36, height: 36, background: '#facc15', borderRadius: 10 }} />
        <div style={{ position: 'absolute', top: 200, left: 660, width: 32, height: 32, background: '#facc15', borderRadius: 8 }} />

        {/* Goo projectiles */}
        <div style={{ position: 'absolute', bottom: 220, left: 580, width: 18, height: 28, borderRadius: 9, background: '#22d3ee', boxShadow: '0 0 20px #22d3ee' }} />
        <div style={{ position: 'absolute', bottom: 320, left: 500, width: 14, height: 22, borderRadius: 7, background: '#67e8f9', boxShadow: '0 0 15px #67e8f9' }} />
        <div style={{ position: 'absolute', bottom: 380, left: 680, width: 14, height: 22, borderRadius: 7, background: '#67e8f9', boxShadow: '0 0 15px #67e8f9' }} />

        {/* Main title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            color: '#22d3ee',
            letterSpacing: 20,
            textShadow: '0 0 60px #22d3ee80',
            marginBottom: 20,
            zIndex: 10,
          }}
        >
          BLAST
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#f472b6',
            letterSpacing: 8,
            marginBottom: 40,
            zIndex: 10,
          }}
        >
          SLIME VS SHAPES
        </div>

        {/* Slime player at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 540,
            width: 120,
            height: 70,
            background: '#22d3ee',
            borderRadius: 60,
            boxShadow: '0 0 40px #22d3ee60',
          }}
        />
        {/* Slime eyes */}
        <div style={{ position: 'absolute', bottom: 140, left: 565, width: 18, height: 24, background: '#09090b', borderRadius: 9 }} />
        <div style={{ position: 'absolute', bottom: 140, left: 615, width: 18, height: 24, background: '#09090b', borderRadius: 9 }} />
        {/* Slime pupils */}
        <div style={{ position: 'absolute', bottom: 148, left: 572, width: 8, height: 8, background: '#ffffff', borderRadius: 4 }} />
        <div style={{ position: 'absolute', bottom: 148, left: 622, width: 8, height: 8, background: '#ffffff', borderRadius: 4 }} />

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#ffffff',
            letterSpacing: 6,
            opacity: 0.8,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #22d3ee', borderLeft: '3px solid #22d3ee' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #22d3ee', borderRight: '3px solid #22d3ee' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #22d3ee', borderLeft: '3px solid #22d3ee' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #22d3ee', borderRight: '3px solid #22d3ee' }} />
      </div>
    ),
    { ...size }
  );
}
