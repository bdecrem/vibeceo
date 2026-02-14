import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SÉANCE - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f0a1a',
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
        {/* Grid background */}
        <div style={{ position: 'absolute', top: 100, left: 350, width: 500, height: 400, background: '#1a1030', borderRadius: 16, opacity: 0.5 }} />
        
        {/* Grid lines */}
        <div style={{ position: 'absolute', top: 100, left: 433, width: 2, height: 400, background: '#ffffff10' }} />
        <div style={{ position: 'absolute', top: 100, left: 516, width: 2, height: 400, background: '#ffffff10' }} />
        <div style={{ position: 'absolute', top: 100, left: 600, width: 2, height: 400, background: '#ffffff10' }} />
        <div style={{ position: 'absolute', top: 100, left: 683, width: 2, height: 400, background: '#ffffff10' }} />
        <div style={{ position: 'absolute', top: 100, left: 766, width: 2, height: 400, background: '#ffffff10' }} />
        <div style={{ position: 'absolute', top: 166, left: 350, width: 500, height: 2, background: '#ffffff10' }} />
        <div style={{ position: 'absolute', top: 233, left: 350, width: 500, height: 2, background: '#ffffff10' }} />
        <div style={{ position: 'absolute', top: 300, left: 350, width: 500, height: 2, background: '#ffffff10' }} />
        <div style={{ position: 'absolute', top: 366, left: 350, width: 500, height: 2, background: '#ffffff10' }} />
        <div style={{ position: 'absolute', top: 433, left: 350, width: 500, height: 2, background: '#ffffff10' }} />

        {/* Player ghost (white, round) */}
        <div style={{ position: 'absolute', top: 160, left: 370, width: 60, height: 70, background: '#ffffff', borderRadius: 30, boxShadow: '0 0 30px #22d3ee60' }} />
        <div style={{ position: 'absolute', top: 180, left: 385, width: 12, height: 16, background: '#0f0a1a', borderRadius: 6 }} />
        <div style={{ position: 'absolute', top: 180, left: 408, width: 12, height: 16, background: '#0f0a1a', borderRadius: 6 }} />

        {/* Blocker ghosts */}
        <div style={{ position: 'absolute', top: 160, left: 500, width: 120, height: 55, background: '#22d3ee', borderRadius: 10, boxShadow: '0 0 25px #22d3ee40' }} />
        <div style={{ position: 'absolute', top: 300, left: 450, width: 55, height: 120, background: '#f472b6', borderRadius: 10, boxShadow: '0 0 25px #f472b640' }} />
        <div style={{ position: 'absolute', top: 370, left: 580, width: 140, height: 55, background: '#71717a', borderRadius: 10 }} />

        {/* Exit portal */}
        <div style={{ position: 'absolute', top: 155, right: 200, width: 70, height: 70, borderRadius: 35, background: '#a78bfa', boxShadow: '0 0 50px #a78bfa, 0 0 80px #f472b6' }} />
        <div style={{ position: 'absolute', top: 175, right: 220, width: 30, height: 30, borderRadius: 15, background: '#ffffff' }} />

        {/* Sparkle particles */}
        <div style={{ position: 'absolute', top: 140, right: 220, width: 8, height: 8, borderRadius: 4, background: '#f472b6' }} />
        <div style={{ position: 'absolute', top: 210, right: 175, width: 6, height: 6, borderRadius: 3, background: '#a78bfa' }} />
        <div style={{ position: 'absolute', top: 170, right: 160, width: 5, height: 5, borderRadius: 3, background: '#22d3ee' }} />

        {/* Main title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#a78bfa',
            letterSpacing: 16,
            textShadow: '0 0 60px #a78bfa80',
            marginBottom: 20,
            zIndex: 10,
          }}
        >
          SÉANCE
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#22d3ee',
            letterSpacing: 8,
            marginBottom: 40,
            zIndex: 10,
          }}
        >
          GHOST ESCAPE PUZZLE
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#f8fafc',
            letterSpacing: 6,
            opacity: 0.8,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #a78bfa', borderLeft: '3px solid #a78bfa' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #a78bfa', borderRight: '3px solid #a78bfa' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #a78bfa', borderLeft: '3px solid #a78bfa' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #a78bfa', borderRight: '3px solid #a78bfa' }} />
      </div>
    ),
    { ...size }
  );
}
