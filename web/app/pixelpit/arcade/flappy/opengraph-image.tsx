import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FLAPPY - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #71c5cf 0%, #4aa3bd 100%)',
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
        {/* Clouds */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 100,
            width: 180,
            height: 60,
            background: '#ffffff',
            borderRadius: 30,
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: 140,
            width: 100,
            height: 80,
            background: '#ffffff',
            borderRadius: 40,
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 100,
            right: 150,
            width: 150,
            height: 50,
            background: '#ffffff',
            borderRadius: 25,
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 90,
            right: 180,
            width: 90,
            height: 70,
            background: '#ffffff',
            borderRadius: 35,
            opacity: 0.8,
          }}
        />

        {/* Pipes - left */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 150,
            width: 60,
            height: 200,
            background: '#73bf2e',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 180,
            left: 145,
            width: 70,
            height: 25,
            background: '#5aa020',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 150,
            width: 60,
            height: 180,
            background: '#73bf2e',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 235,
            left: 145,
            width: 70,
            height: 25,
            background: '#5aa020',
            borderRadius: 4,
          }}
        />

        {/* Pipes - right */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 150,
            width: 60,
            height: 150,
            background: '#73bf2e',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 130,
            right: 145,
            width: 70,
            height: 25,
            background: '#5aa020',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            right: 150,
            width: 60,
            height: 230,
            background: '#73bf2e',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 285,
            right: 145,
            width: 70,
            height: 25,
            background: '#5aa020',
            borderRadius: 4,
          }}
        />

        {/* Bird body */}
        <div
          style={{
            position: 'absolute',
            top: 260,
            left: 550,
            width: 70,
            height: 70,
            background: '#f7dc6f',
            borderRadius: 35,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        />
        {/* Bird eye white */}
        <div
          style={{
            position: 'absolute',
            top: 265,
            left: 590,
            width: 24,
            height: 24,
            background: '#ffffff',
            borderRadius: 12,
          }}
        />
        {/* Bird eye pupil */}
        <div
          style={{
            position: 'absolute',
            top: 270,
            left: 598,
            width: 12,
            height: 12,
            background: '#000000',
            borderRadius: 6,
          }}
        />
        {/* Bird beak */}
        <div
          style={{
            position: 'absolute',
            top: 285,
            left: 615,
            width: 0,
            height: 0,
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent',
            borderLeft: '20px solid #e74c3c',
          }}
        />
        {/* Bird wing */}
        <div
          style={{
            position: 'absolute',
            top: 295,
            left: 545,
            width: 30,
            height: 20,
            background: '#f5cd5e',
            borderRadius: 10,
          }}
        />

        {/* Ground */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: '#ded895',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            left: 0,
            right: 0,
            height: 10,
            background: '#c9b77c',
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: 12,
            textShadow: '4px 4px 0 #000000, -2px -2px 0 #000000, 2px -2px 0 #000000, -2px 2px 0 #000000',
            marginBottom: 10,
            zIndex: 10,
          }}
        >
          FLAPPY
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#73bf2e',
            letterSpacing: 8,
            textShadow: '2px 2px 0 #000000',
            zIndex: 10,
          }}
        >
          TAP TO FLY
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            fontSize: 22,
            color: '#ffffff',
            letterSpacing: 6,
            opacity: 0.9,
            textShadow: '1px 1px 0 #000000',
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
            borderTop: '3px solid #f7dc6f',
            borderLeft: '3px solid #f7dc6f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '3px solid #f7dc6f',
            borderRight: '3px solid #f7dc6f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #f7dc6f',
            borderLeft: '3px solid #f7dc6f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #f7dc6f',
            borderRight: '3px solid #f7dc6f',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
