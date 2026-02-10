import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ORBIT - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: 'linear-gradient(180deg, #1a0a2e 0%, #0a0a1a 50%, #050510 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Stars — mixed white, purple, cyan */}
        <div style={{ position: 'absolute', top: 40, left: 150, width: 4, height: 4, borderRadius: 2, background: '#ffffff80' }} />
        <div style={{ position: 'absolute', top: 100, left: 400, width: 3, height: 3, borderRadius: 2, background: '#a78bfa80' }} />
        <div style={{ position: 'absolute', top: 80, right: 250, width: 5, height: 5, borderRadius: 3, background: '#ffffff60' }} />
        <div style={{ position: 'absolute', top: 150, right: 500, width: 3, height: 3, borderRadius: 2, background: '#67e8f980' }} />
        <div style={{ position: 'absolute', bottom: 200, left: 300, width: 4, height: 4, borderRadius: 2, background: '#ffffff70' }} />
        <div style={{ position: 'absolute', bottom: 150, right: 350, width: 3, height: 3, borderRadius: 2, background: '#7c3aed80' }} />
        <div style={{ position: 'absolute', top: 200, left: 80, width: 3, height: 3, borderRadius: 2, background: '#22d3ee60' }} />
        <div style={{ position: 'absolute', top: 300, right: 120, width: 4, height: 4, borderRadius: 2, background: '#ffffff50' }} />
        <div style={{ position: 'absolute', bottom: 250, right: 600, width: 3, height: 3, borderRadius: 2, background: '#a78bfa60' }} />
        <div style={{ position: 'absolute', bottom: 100, left: 500, width: 5, height: 5, borderRadius: 3, background: '#67e8f950' }} />

        {/* Orbital rings */}
        <div style={{
          position: 'absolute',
          width: 420,
          height: 420,
          border: '1px solid #7c3aed30',
          borderRadius: 9999,
        }} />
        <div style={{
          position: 'absolute',
          width: 520,
          height: 520,
          border: '1px solid #22d3ee15',
          borderRadius: 9999,
        }} />

        {/* UFO emoji */}
        <div style={{ fontSize: 100, marginBottom: 10 }}>
          🛸
        </div>

        {/* Title — wide tracked, white with purple glow */}
        <div style={{
          fontSize: 140,
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: 24,
        }}>
          ORBIT
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 22,
          color: '#7C3AED',
          letterSpacing: 8,
          fontWeight: 600,
          marginTop: 4,
        }}>
          CROSS THE VOID
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 25, left: 25, width: 35, height: 35, borderTop: '3px solid #7C3AED', borderLeft: '3px solid #7C3AED' }} />
        <div style={{ position: 'absolute', top: 25, right: 25, width: 35, height: 35, borderTop: '3px solid #7C3AED', borderRight: '3px solid #7C3AED' }} />
        <div style={{ position: 'absolute', bottom: 25, left: 25, width: 35, height: 35, borderBottom: '3px solid #7C3AED', borderLeft: '3px solid #7C3AED' }} />
        <div style={{ position: 'absolute', bottom: 25, right: 25, width: 35, height: 35, borderBottom: '3px solid #7C3AED', borderRight: '3px solid #7C3AED' }} />

        {/* Branding */}
        <div style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 20,
          color: '#6B7280',
          letterSpacing: 6,
        }}>
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
