import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SUPERBEAM - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1A1A2E',
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
        {/* Background grid lines */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '0 200px',
            opacity: 0.15,
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                width: '100%',
                height: 2,
                background: '#4ECDC4',
              }}
            />
          ))}
        </div>

        {/* Vertical lane lines */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 120,
            opacity: 0.1,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                width: 2,
                height: '100%',
                background: '#4ECDC4',
              }}
            />
          ))}
        </div>

        {/* Magenta wall accent */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 150,
            right: 150,
            height: 20,
            background: 'linear-gradient(90deg, transparent 0%, #C44DFF 20%, #C44DFF 40%, transparent 41%, transparent 59%, #C44DFF 60%, #C44DFF 80%, transparent 100%)',
            boxShadow: '0 0 40px #C44DFF',
          }}
        />

        {/* Another wall */}
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 150,
            right: 150,
            height: 20,
            background: 'linear-gradient(90deg, #C44DFF 0%, #C44DFF 30%, transparent 31%, transparent 69%, #C44DFF 70%, #C44DFF 100%)',
            boxShadow: '0 0 40px #C44DFF',
          }}
        />

        {/* Player beam */}
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            left: '50%',
            marginLeft: -6,
            width: 12,
            height: 60,
            background: 'linear-gradient(180deg, #4ECDC4 0%, #E8B87D 100%)',
            boxShadow: '0 0 30px #4ECDC4',
            borderRadius: 2,
          }}
        />

        {/* Main title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#4ECDC4',
            letterSpacing: 16,
            textShadow: '0 0 60px rgba(78, 205, 196, 0.8)',
            marginBottom: 20,
          }}
        >
          SUPERBEAM
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#E8B87D',
            letterSpacing: 8,
            marginBottom: 40,
          }}
        >
          DODGE THE WALLS
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#F5E6D3',
            letterSpacing: 6,
            opacity: 0.8,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            width: 40,
            height: 40,
            borderTop: '3px solid #FFD93D',
            borderLeft: '3px solid #FFD93D',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: 30,
            width: 40,
            height: 40,
            borderTop: '3px solid #FFD93D',
            borderRight: '3px solid #FFD93D',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 30,
            width: 40,
            height: 40,
            borderBottom: '3px solid #FFD93D',
            borderLeft: '3px solid #FFD93D',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 30,
            width: 40,
            height: 40,
            borderBottom: '3px solid #FFD93D',
            borderRight: '3px solid #FFD93D',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
