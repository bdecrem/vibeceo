import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CAVE MOTH - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a1a',
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
        {/* Cave walls */}
        <div
          style={{
            position: 'absolute',
            top: 120,
            left: 0,
            right: 0,
            height: 4,
            background: '#2d1b4e',
            boxShadow: '0 0 15px #6c348380',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 0,
            right: 0,
            height: 4,
            background: '#2d1b4e',
            boxShadow: '0 0 15px #6c348380',
          }}
        />

        {/* Ceiling stalactites (amethyst) */}
        <div
          style={{
            position: 'absolute',
            top: 124,
            left: 200,
            width: 10,
            height: 50,
            background: '#9b59b6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 124,
            left: 500,
            width: 12,
            height: 60,
            background: '#9b59b6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 124,
            right: 300,
            width: 8,
            height: 40,
            background: '#9b59b6',
          }}
        />

        {/* Floor stalagmites (amethyst) */}
        <div
          style={{
            position: 'absolute',
            bottom: 124,
            left: 350,
            width: 10,
            height: 50,
            background: '#9b59b6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 124,
            right: 200,
            width: 12,
            height: 60,
            background: '#9b59b6',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 124,
            left: 700,
            width: 9,
            height: 45,
            background: '#9b59b6',
          }}
        />

        {/* Ambient sparkles */}
        <div style={{ position: 'absolute', top: 200, left: 150, width: 4, height: 4, borderRadius: 2, background: '#c6f68d80' }} />
        <div style={{ position: 'absolute', top: 350, left: 800, width: 3, height: 3, borderRadius: 2, background: '#c6f68d60' }} />
        <div style={{ position: 'absolute', top: 280, right: 250, width: 5, height: 5, borderRadius: 3, background: '#c6f68d40' }} />

        {/* Moth silhouette (body glow) */}
        <div
          style={{
            position: 'absolute',
            top: 270,
            left: 300,
            width: 14,
            height: 20,
            borderRadius: 7,
            background: '#a8e6cf',
            boxShadow: '0 0 30px #4ecdc4, 0 0 60px #4ecdc440',
          }}
        />
        {/* Moth wing left */}
        <div
          style={{
            position: 'absolute',
            top: 265,
            left: 280,
            width: 18,
            height: 14,
            borderRadius: 7,
            background: '#a8e6cf60',
          }}
        />
        {/* Moth wing right */}
        <div
          style={{
            position: 'absolute',
            top: 265,
            left: 316,
            width: 18,
            height: 14,
            borderRadius: 7,
            background: '#a8e6cf60',
          }}
        />

        {/* Phosphorescent trail */}
        <div
          style={{
            position: 'absolute',
            top: 278,
            left: 260,
            width: 12,
            height: 12,
            borderRadius: 6,
            background: '#c6f68d40',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 282,
            left: 235,
            width: 8,
            height: 8,
            borderRadius: 4,
            background: '#c6f68d20',
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#4ecdc4',
            letterSpacing: 16,
            textShadow: '0 0 60px #4ecdc480',
            marginBottom: 6,
            zIndex: 10,
          }}
        >
          CAVE MOTH
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 26,
            color: '#c6f68d',
            letterSpacing: 10,
            zIndex: 10,
          }}
        >
          CRYSTAL CAVERN
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 22,
            color: '#8b7fa8',
            letterSpacing: 6,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 25, left: 25, width: 35, height: 35, borderTop: '3px solid #4ecdc4', borderLeft: '3px solid #4ecdc4' }} />
        <div style={{ position: 'absolute', top: 25, right: 25, width: 35, height: 35, borderTop: '3px solid #4ecdc4', borderRight: '3px solid #4ecdc4' }} />
        <div style={{ position: 'absolute', bottom: 25, left: 25, width: 35, height: 35, borderBottom: '3px solid #4ecdc4', borderLeft: '3px solid #4ecdc4' }} />
        <div style={{ position: 'absolute', bottom: 25, right: 25, width: 35, height: 35, borderBottom: '3px solid #4ecdc4', borderRight: '3px solid #4ecdc4' }} />
      </div>
    ),
    { ...size }
  );
}
