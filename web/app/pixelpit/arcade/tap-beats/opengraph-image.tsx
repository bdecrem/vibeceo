import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TAP BEATS - Pixelpit Arcade';
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
        }}
      >
        {/* Lane dividers */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 400,
            width: 2,
            background: '#ffffff20',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 800,
            width: 2,
            background: '#ffffff20',
          }}
        />

        {/* Hit zone circles */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 165,
            width: 70,
            height: 70,
            borderRadius: 35,
            border: '3px solid #22d3ee',
            background: '#22d3ee30',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 565,
            width: 70,
            height: 70,
            borderRadius: 35,
            border: '3px solid #ec4899',
            background: '#ec489930',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 965,
            width: 70,
            height: 70,
            borderRadius: 35,
            border: '3px solid #facc15',
            background: '#facc1530',
          }}
        />

        {/* Falling notes */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 183,
            width: 36,
            height: 36,
            borderRadius: 18,
            background: '#22d3ee',
            boxShadow: '0 0 20px #22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 583,
            width: 36,
            height: 36,
            borderRadius: 18,
            background: '#ec4899',
            boxShadow: '0 0 20px #ec4899',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 140,
            left: 983,
            width: 36,
            height: 36,
            borderRadius: 18,
            background: '#facc15',
            boxShadow: '0 0 20px #facc15',
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#ec4899',
            letterSpacing: 16,
            textShadow: '0 0 60px #ec4899',
          }}
        >
          TAP BEATS
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#22d3ee',
            letterSpacing: 8,
            marginTop: 10,
          }}
        >
          RHYTHM ARCADE
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#f8fafc',
            letterSpacing: 6,
            opacity: 0.7,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: 25,
            width: 35,
            height: 35,
            borderTop: '3px solid #ec4899',
            borderLeft: '3px solid #ec4899',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '3px solid #ec4899',
            borderRight: '3px solid #ec4899',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #ec4899',
            borderLeft: '3px solid #ec4899',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #ec4899',
            borderRight: '3px solid #ec4899',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
