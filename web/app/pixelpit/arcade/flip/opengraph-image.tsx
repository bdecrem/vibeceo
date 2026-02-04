import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FLIP - Pixelpit Arcade';
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
        {/* Tunnel walls */}
        <div
          style={{
            position: 'absolute',
            top: 120,
            left: 0,
            right: 0,
            height: 4,
            background: '#27272a',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 0,
            right: 0,
            height: 4,
            background: '#27272a',
          }}
        />

        {/* Ceiling spikes */}
        <div
          style={{
            position: 'absolute',
            top: 124,
            left: 200,
            width: 0,
            height: 0,
            borderLeft: '25px solid transparent',
            borderRight: '25px solid transparent',
            borderTop: '50px solid #ef4444',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 124,
            left: 500,
            width: 0,
            height: 0,
            borderLeft: '30px solid transparent',
            borderRight: '30px solid transparent',
            borderTop: '60px solid #ef4444',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 124,
            right: 300,
            width: 0,
            height: 0,
            borderLeft: '20px solid transparent',
            borderRight: '20px solid transparent',
            borderTop: '40px solid #ef4444',
          }}
        />

        {/* Floor spikes */}
        <div
          style={{
            position: 'absolute',
            bottom: 124,
            left: 350,
            width: 0,
            height: 0,
            borderLeft: '25px solid transparent',
            borderRight: '25px solid transparent',
            borderBottom: '50px solid #ef4444',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 124,
            right: 200,
            width: 0,
            height: 0,
            borderLeft: '30px solid transparent',
            borderRight: '30px solid transparent',
            borderBottom: '60px solid #ef4444',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 124,
            left: 700,
            width: 0,
            height: 0,
            borderLeft: '22px solid transparent',
            borderRight: '22px solid transparent',
            borderBottom: '45px solid #ef4444',
          }}
        />

        {/* Player */}
        <div
          style={{
            position: 'absolute',
            top: 280,
            left: 300,
            width: 30,
            height: 30,
            background: '#f8fafc',
            boxShadow: '0 0 30px #22d3ee, 0 0 60px #22d3ee40',
          }}
        />

        {/* Player trail */}
        <div
          style={{
            position: 'absolute',
            top: 285,
            left: 260,
            width: 20,
            height: 20,
            background: '#22d3ee40',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 290,
            left: 230,
            width: 15,
            height: 15,
            background: '#22d3ee20',
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            color: '#22d3ee',
            letterSpacing: 20,
            textShadow: '0 0 60px #22d3ee80',
            marginBottom: 10,
            zIndex: 10,
          }}
        >
          FLIP
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#f8fafc',
            letterSpacing: 8,
            zIndex: 10,
          }}
        >
          TAP TO REVERSE GRAVITY
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 22,
            color: '#71717a',
            letterSpacing: 6,
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
            borderTop: '3px solid #22d3ee',
            borderLeft: '3px solid #22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '3px solid #22d3ee',
            borderRight: '3px solid #22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #22d3ee',
            borderLeft: '3px solid #22d3ee',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #22d3ee',
            borderRight: '3px solid #22d3ee',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
