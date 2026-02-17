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
          background: 'linear-gradient(180deg, #06060f 0%, #0a0a1a 50%, #0f0a1e 100%)',
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
        {/* Subtle grid lines */}
        <div style={{ position: 'absolute', top: 0, left: 200, width: 1, height: '100%', background: '#ffffff08' }} />
        <div style={{ position: 'absolute', top: 0, left: 400, width: 1, height: '100%', background: '#ffffff08' }} />
        <div style={{ position: 'absolute', top: 0, left: 600, width: 1, height: '100%', background: '#ffffff08' }} />
        <div style={{ position: 'absolute', top: 0, left: 800, width: 1, height: '100%', background: '#ffffff08' }} />
        <div style={{ position: 'absolute', top: 0, left: 1000, width: 1, height: '100%', background: '#ffffff08' }} />

        {/* Enemy formation - wireframe shapes with glow */}
        {/* Row 1 - triangles (pink) - using border trick */}
        <div style={{ position: 'absolute', top: 80, left: 300, width: 0, height: 0, borderLeft: '18px solid #00000000', borderRight: '18px solid #00000000', borderBottom: '30px solid #f472b640' }} />
        <div style={{ position: 'absolute', top: 75, left: 420, width: 0, height: 0, borderLeft: '22px solid #00000000', borderRight: '22px solid #00000000', borderBottom: '36px solid #f472b650' }} />
        <div style={{ position: 'absolute', top: 80, left: 540, width: 0, height: 0, borderLeft: '18px solid #00000000', borderRight: '18px solid #00000000', borderBottom: '30px solid #f472b640' }} />
        <div style={{ position: 'absolute', top: 75, left: 660, width: 0, height: 0, borderLeft: '22px solid #00000000', borderRight: '22px solid #00000000', borderBottom: '36px solid #f472b650' }} />
        <div style={{ position: 'absolute', top: 80, left: 780, width: 0, height: 0, borderLeft: '18px solid #00000000', borderRight: '18px solid #00000000', borderBottom: '30px solid #f472b640' }} />

        {/* Row 2 - squares (purple) - hollow wireframe */}
        <div style={{ position: 'absolute', top: 140, left: 350, width: 30, height: 30, border: '2px solid #a78bfa', background: '#a78bfa15' }} />
        <div style={{ position: 'absolute', top: 138, left: 470, width: 36, height: 36, border: '2px solid #a78bfa', background: '#a78bfa15' }} />
        <div style={{ position: 'absolute', top: 140, left: 590, width: 30, height: 30, border: '2px solid #a78bfa', background: '#a78bfa15' }} />
        <div style={{ position: 'absolute', top: 138, left: 710, width: 36, height: 36, border: '2px solid #a78bfa', background: '#a78bfa15' }} />

        {/* Row 3 - hexagons (yellow) - using rounded squares as approximation */}
        <div style={{ position: 'absolute', top: 200, left: 400, width: 28, height: 28, border: '2px solid #facc15', background: '#facc1515', borderRadius: 8 }} />
        <div style={{ position: 'absolute', top: 198, left: 530, width: 32, height: 32, border: '2px solid #facc15', background: '#facc1515', borderRadius: 10 }} />
        <div style={{ position: 'absolute', top: 200, left: 660, width: 28, height: 28, border: '2px solid #facc15', background: '#facc1515', borderRadius: 8 }} />

        {/* Projectile streaks */}
        <div style={{ position: 'absolute', bottom: 220, left: 585, width: 6, height: 30, borderRadius: 3, background: '#67e8f9', boxShadow: '0 0 20px #22d3ee' }} />
        <div style={{ position: 'absolute', bottom: 310, left: 505, width: 5, height: 24, borderRadius: 3, background: '#67e8f9', boxShadow: '0 0 15px #22d3ee' }} />
        <div style={{ position: 'absolute', bottom: 370, left: 685, width: 5, height: 24, borderRadius: 3, background: '#67e8f9', boxShadow: '0 0 15px #22d3ee' }} />

        {/* Main title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            color: '#22d3ee',
            letterSpacing: 20,
            textShadow: '0 0 60px #22d3ee66',
            marginBottom: 16,
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
          BREAK THE SHAPES
        </div>

        {/* Chevron hull player at bottom - wireframe chevron using borders */}
        <div
          style={{
            position: 'absolute',
            bottom: 95,
            left: 564,
            width: 0,
            height: 0,
            borderLeft: '36px solid #00000000',
            borderRight: '36px solid #00000000',
            borderBottom: '50px solid #22d3ee30',
          }}
        />
        {/* Hull core glow */}
        <div
          style={{
            position: 'absolute',
            bottom: 108,
            left: 590,
            width: 20,
            height: 20,
            borderRadius: 9999,
            background: '#22d3ee',
            boxShadow: '0 0 30px #22d3ee80',
          }}
        />
        {/* Eye center */}
        <div
          style={{
            position: 'absolute',
            bottom: 114,
            left: 596,
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: '#ffffff',
          }}
        />

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#ffffff',
            letterSpacing: 6,
            opacity: 0.7,
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
