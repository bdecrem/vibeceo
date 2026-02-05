import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'HAUNT - Pixelpit Arcade';
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
        {/* Grid of rooms */}
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 180,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {[0, 1, 2].map((row) => (
            <div key={row} style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2, 3].map((col) => {
                const isDanger = row === 1 && col === 2;
                const isExit = row === 2 && col === 3;
                const isEntrance = row === 0 && col === 0;
                return (
                  <div
                    key={col}
                    style={{
                      width: 50,
                      height: 50,
                      background: isDanger ? '#7f1d1d' : isExit ? '#1a2e1a' : '#1c1917',
                      border: '2px solid #27272a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isDanger && <span style={{ fontSize: 20 }}>☠</span>}
                    {isExit && <span style={{ color: '#22c55e', fontSize: 10 }}>EXIT</span>}
                    {isEntrance && <span style={{ color: '#a1a1aa', fontSize: 10 }}>IN</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Ghost decorations */}
        <div
          style={{
            position: 'absolute',
            right: 150,
            top: 200,
            fontSize: 80,
            opacity: 0.3,
          }}
        >
          👻
        </div>

        {/* Purple glow */}
        <div
          style={{
            position: 'absolute',
            left: 200,
            top: 300,
            width: 100,
            height: 100,
            background: 'linear-gradient(180deg, #7c3aed40 0%, #7c3aed00 100%)',
            borderRadius: 50,
          }}
        />

        {/* Game title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#7c3aed',
            textShadow: '0 0 60px #7c3aed',
            letterSpacing: 8,
          }}
        >
          HAUNT
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            marginTop: 20,
            letterSpacing: 4,
          }}
        >
          you are the haunted house
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: 18,
            color: '#ef4444',
            marginTop: 15,
          }}
        >
          guide tourists to safety. don&apos;t let them die.
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
