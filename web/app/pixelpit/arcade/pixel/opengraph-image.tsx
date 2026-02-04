import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PIXEL - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Heart pattern for decoration
  const pattern = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];

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
        {/* Grid decoration - left side */}
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 180,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {pattern.map((row, r) => (
            <div key={r} style={{ display: 'flex', gap: 4 }}>
              {row.map((cell, c) => (
                <div
                  key={c}
                  style={{
                    width: 28,
                    height: 28,
                    background: cell === 1 ? '#22d3ee' : '#18181b',
                    boxShadow: cell === 1 ? '0 0 10px #22d3ee' : 'none',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Grid decoration - right side (star) */}
        <div
          style={{
            position: 'absolute',
            right: 80,
            top: 180,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {[
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 1, 0, 1, 0],
          ].map((row, r) => (
            <div key={r} style={{ display: 'flex', gap: 4 }}>
              {row.map((cell, c) => (
                <div
                  key={c}
                  style={{
                    width: 28,
                    height: 28,
                    background: cell === 1 ? '#a3e635' : '#18181b',
                    boxShadow: cell === 1 ? '0 0 10px #a3e635' : 'none',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Game title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#22d3ee',
            textShadow: '0 0 60px #22d3ee',
            letterSpacing: 12,
          }}
        >
          PIXEL
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#a1a1aa',
            marginTop: 20,
            letterSpacing: 4,
          }}
        >
          nonogram puzzles
        </div>

        {/* Puzzle count */}
        <div
          style={{
            fontSize: 20,
            color: '#a3e635',
            marginTop: 15,
          }}
        >
          15 puzzles to solve
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
