import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'HAUNT Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const touristsSaved = params.score;
  const won = touristsSaved === '5';
  const tagline = won ? 'ALL SAFE!' : 'CAN YOU BEAT ME?';

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
        {/* Ghost decorations */}
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 150,
            fontSize: 60,
            opacity: 0.2,
          }}
        >
          👻
        </div>
        <div
          style={{
            position: 'absolute',
            right: 120,
            top: 180,
            fontSize: 50,
            opacity: 0.15,
          }}
        >
          👻
        </div>
        <div
          style={{
            position: 'absolute',
            left: 200,
            bottom: 150,
            fontSize: 40,
            opacity: 0.1,
          }}
        >
          👻
        </div>

        {/* Purple glow effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 200,
            background: 'linear-gradient(180deg, #7c3aed20 0%, #7c3aed00 100%)',
          }}
        />

        {/* Corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: 25,
            width: 35,
            height: 35,
            borderTop: '3px solid #7c3aed',
            borderLeft: '3px solid #7c3aed',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: 25,
            width: 35,
            height: 35,
            borderTop: '3px solid #7c3aed',
            borderRight: '3px solid #7c3aed',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            left: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #7c3aed',
            borderLeft: '3px solid #7c3aed',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 25,
            right: 25,
            width: 35,
            height: 35,
            borderBottom: '3px solid #7c3aed',
            borderRight: '3px solid #7c3aed',
          }}
        />

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: won ? '#22c55e' : '#7c3aed',
            letterSpacing: 12,
            textShadow: won ? '0 0 40px #22c55e99' : '0 0 40px #7c3aed99',
            marginBottom: 20,
          }}
        >
          HAUNT
        </div>

        {/* Score display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 180,
              fontWeight: 700,
              color: won ? '#22c55e' : '#7c3aed',
              textShadow: won ? '0 0 80px #22c55ecc' : '0 0 80px #7c3aedcc',
              lineHeight: 1,
            }}
          >
            {touristsSaved}
          </div>
          <div
            style={{
              fontSize: 48,
              color: '#a1a1aa',
            }}
          >
            / 5
          </div>
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            letterSpacing: 4,
            marginTop: 10,
          }}
        >
          TOURISTS SAVED
        </div>

        {/* Call to action */}
        <div
          style={{
            fontSize: 24,
            color: won ? '#22c55e' : '#a855f7',
            letterSpacing: 4,
            marginTop: 20,
          }}
        >
          {tagline}
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
