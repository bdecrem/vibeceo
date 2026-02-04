import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CATCH - Pixelpit Arcade';
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
        {/* Shadow safe zones */}
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 150,
            width: 200,
            height: 200,
            borderRadius: 100,
            background: 'linear-gradient(180deg, #0a0a0f 0%, #00000000 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 120,
            top: 200,
            width: 180,
            height: 180,
            borderRadius: 90,
            background: 'linear-gradient(180deg, #0a0a0f 0%, #00000000 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 500,
            bottom: 100,
            width: 220,
            height: 220,
            borderRadius: 110,
            background: 'linear-gradient(180deg, #0a0a0f 0%, #00000000 100%)',
          }}
        />

        {/* Falling coins (the trap) */}
        <div
          style={{
            position: 'absolute',
            left: 200,
            top: 80,
            width: 40,
            height: 40,
            borderRadius: 20,
            background: '#fbbf24',
            boxShadow: '0 0 30px #fbbf24',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 450,
            top: 120,
            width: 35,
            height: 35,
            borderRadius: 18,
            background: '#fbbf24',
            boxShadow: '0 0 25px #fbbf24',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 250,
            top: 60,
            width: 38,
            height: 38,
            borderRadius: 19,
            background: '#fbbf24',
            boxShadow: '0 0 28px #fbbf24',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 400,
            top: 160,
            width: 32,
            height: 32,
            borderRadius: 16,
            background: '#fbbf24',
            boxShadow: '0 0 22px #fbbf24',
          }}
        />

        {/* Player (cyan, safe in shadow) */}
        <div
          style={{
            position: 'absolute',
            left: 160,
            top: 220,
            width: 40,
            height: 40,
            borderRadius: 20,
            background: '#22d3ee',
            boxShadow: '0 0 30px #22d3ee60',
          }}
        />

        {/* Game title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#fbbf24',
            textShadow: '0 0 60px #fbbf24',
            letterSpacing: 8,
          }}
        >
          CATCH
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#94a3b8',
            marginTop: 20,
            letterSpacing: 4,
          }}
        >
          collect coins. survive 60 seconds.
        </div>

        {/* The twist hint */}
        <div
          style={{
            fontSize: 20,
            color: '#ffffff40',
            marginTop: 15,
            fontStyle: 'italic',
          }}
        >
          ...easy, right?
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#71717a',
            letterSpacing: 6,
          }}
        >
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
