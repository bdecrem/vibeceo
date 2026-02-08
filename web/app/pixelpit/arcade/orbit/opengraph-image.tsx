import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ORBIT - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#0a0a2a',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Stars */}
        <div style={{ position: 'absolute', top: 40, left: 150, width: 4, height: 4, borderRadius: 2, background: '#ffffff80' }} />
        <div style={{ position: 'absolute', top: 100, left: 400, width: 3, height: 3, borderRadius: 2, background: '#a5b4fc80' }} />
        <div style={{ position: 'absolute', top: 80, right: 250, width: 5, height: 5, borderRadius: 3, background: '#ffffff60' }} />
        <div style={{ position: 'absolute', top: 150, right: 500, width: 3, height: 3, borderRadius: 2, background: '#67e8f980' }} />
        <div style={{ position: 'absolute', bottom: 200, left: 300, width: 4, height: 4, borderRadius: 2, background: '#ffffff70' }} />
        <div style={{ position: 'absolute', bottom: 150, right: 350, width: 3, height: 3, borderRadius: 2, background: '#f9a8d480' }} />

        {/* Rocket emoji */}
        <div style={{ fontSize: 100, marginBottom: 10 }}>
          🚀
        </div>

        {/* Title */}
        <div style={{
          fontSize: 140,
          fontWeight: 700,
          color: '#E5E7EB',
          letterSpacing: 20,
        }}>
          ORBIT
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 28, color: '#22D3EE', letterSpacing: 6 }}>
          DODGE UFOs • RIDE SATELLITES
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
          color: '#9CA3AF',
          letterSpacing: 6,
          opacity: 0.7,
        }}>
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
