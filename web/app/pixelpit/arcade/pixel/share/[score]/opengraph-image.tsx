import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PIXEL Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const puzzlesSolved = params.score;

  // Heart pattern for decoration
  const heart = [
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
        {/* Grid decoration - left */}
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            opacity: 0.6,
          }}
        >
          {heart.map((row, r) => (
            <div key={r} style={{ display: 'flex', gap: 3 }}>
              {row.map((cell, c) => (
                <div
                  key={c}
                  style={{
                    width: 24,
                    height: 24,
                    background: cell === 1 ? '#22d3ee' : '#18181b',
                    boxShadow: cell === 1 ? '0 0 8px #22d3ee' : 'none',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Grid decoration - right */}
        <div
          style={{
            position: 'absolute',
            right: 100,
            top: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            opacity: 0.6,
          }}
        >
          {[
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 1, 0, 1, 0],
          ].map((row, r) => (
            <div key={r} style={{ display: 'flex', gap: 3 }}>
              {row.map((cell, c) => (
                <div
                  key={c}
                  style={{
                    width: 24,
                    height: 24,
                    background: cell === 1 ? '#a3e635' : '#18181b',
                    boxShadow: cell === 1 ? '0 0 8px #a3e635' : 'none',
                  }}
                />
              ))}
            </div>
          ))}
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

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#a3e635',
            letterSpacing: 12,
            textShadow: '0 0 40px #a3e63599',
            marginBottom: 20,
          }}
        >
          PIXEL
        </div>

        {/* Big score */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 700,
            color: '#22d3ee',
            textShadow: '0 0 80px #22d3eecc',
            lineHeight: 1,
          }}
        >
          {puzzlesSolved}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 32,
            color: '#a1a1aa',
            letterSpacing: 4,
            marginTop: 10,
          }}
        >
          PUZZLES SOLVED
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 24,
            color: '#a3e635',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          CAN YOU BEAT ME?
        </div>

        {/* Pixelpit branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 20,
            color: '#71717a',
            letterSpacing: 6,
            opacity: 0.7,
          }}
        >
          PIXELPIT ARCADE
        </div>
      </div>
    ),
    { ...size }
  );
}
