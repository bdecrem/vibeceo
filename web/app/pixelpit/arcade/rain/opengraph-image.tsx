import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RAIN - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#000000',
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
        {/* Ambient glow at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background: 'linear-gradient(180deg, transparent 0%, rgba(45, 149, 150, 0.15) 100%)',
          }}
        />

        {/* Falling amber drops */}
        {[
          { left: 150, top: 80 },
          { left: 350, top: 180 },
          { left: 550, top: 50 },
          { left: 750, top: 150 },
          { left: 950, top: 100 },
          { left: 250, top: 280 },
          { left: 650, top: 250 },
          { left: 850, top: 320 },
          { left: 450, top: 350 },
          { left: 1050, top: 220 },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              width: 24,
              height: 34,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              background: 'linear-gradient(180deg, #FFD700 0%, #D4A574 100%)',
              boxShadow: '0 0 20px rgba(212, 165, 116, 0.6)',
            }}
          />
        ))}

        {/* Basket */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: '50%',
            marginLeft: -50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Basket rim */}
          <div
            style={{
              width: 110,
              height: 4,
              background: '#2D9596',
              marginBottom: -2,
            }}
          />
          {/* Basket body - trapezoid approximation */}
          <div
            style={{
              width: 100,
              height: 60,
              background: 'linear-gradient(180deg, #2D9596 0%, rgba(45, 149, 150, 0.5) 100%)',
              borderRadius: '0 0 15px 15px',
              border: '2px solid #2D9596',
              borderTop: 'none',
            }}
          />
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            color: '#FFD700',
            letterSpacing: 20,
            textShadow: '0 0 60px rgba(255, 215, 0, 0.6)',
            marginBottom: 20,
          }}
        >
          RAIN
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#D4A574',
            letterSpacing: 8,
            marginBottom: 40,
          }}
        >
          CATCH THE FALLING LIGHT
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#D4A574',
            letterSpacing: 6,
            opacity: 0.8,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents in teal */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            width: 40,
            height: 40,
            borderTop: '3px solid #2D9596',
            borderLeft: '3px solid #2D9596',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: 30,
            width: 40,
            height: 40,
            borderTop: '3px solid #2D9596',
            borderRight: '3px solid #2D9596',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 30,
            width: 40,
            height: 40,
            borderBottom: '3px solid #2D9596',
            borderLeft: '3px solid #2D9596',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 30,
            width: 40,
            height: 40,
            borderBottom: '3px solid #2D9596',
            borderRight: '3px solid #2D9596',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
