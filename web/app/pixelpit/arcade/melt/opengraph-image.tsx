import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MELT - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #1a0000 100%)',
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
        {/* Lava slashes — horizontal heat lines */}
        <div
          style={{
            position: 'absolute',
            bottom: 140,
            left: 200,
            width: 300,
            height: 4,
            background: '#ff4400',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 136,
            left: 220,
            width: 260,
            height: 2,
            background: '#ff8844',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            right: 200,
            width: 250,
            height: 4,
            background: '#ff4400',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 176,
            right: 220,
            width: 210,
            height: 2,
            background: '#ff8844',
          }}
        />

        {/* Heat glow from below */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background: 'linear-gradient(180deg, #00000000 0%, #8b000040 100%)',
          }}
        />

        {/* Ice shard — the player */}
        <div
          style={{
            position: 'absolute',
            top: 180,
            left: 520,
            width: 40,
            height: 40,
            background: '#ffffff',
            transform: 'rotate(45deg)',
          }}
        />

        {/* Ice diamond pickup */}
        <div
          style={{
            position: 'absolute',
            top: 280,
            right: 350,
            width: 20,
            height: 20,
            background: '#aaeeff',
            transform: 'rotate(45deg)',
          }}
        />

        {/* Game title */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: 20,
            zIndex: 10,
          }}
        >
          MELT
        </div>

        {/* Accent bar */}
        <div
          style={{
            width: 60,
            height: 3,
            background: '#cc2200',
            marginTop: 10,
            zIndex: 10,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: '#444444',
            marginTop: 20,
            letterSpacing: 8,
            zIndex: 10,
          }}
        >
          DODGE LAVA • COLLECT ICE • STAY ALIVE
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 18,
            color: '#444444',
            letterSpacing: 8,
          }}
        >
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
