import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SHINE Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

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
        {/* Ambient glow circles */}
        <div style={{ position: 'absolute', top: 80, left: 200, width: 120, height: 120, borderRadius: 9999, background: 'radial-gradient(circle, #D4A57440, transparent)', }} />
        <div style={{ position: 'absolute', bottom: 120, right: 250, width: 80, height: 80, borderRadius: 9999, background: 'radial-gradient(circle, #2D959640, transparent)', }} />
        <div style={{ position: 'absolute', top: 200, right: 180, width: 60, height: 60, borderRadius: 9999, background: 'radial-gradient(circle, #7B68EE40, transparent)', }} />
        <div style={{ position: 'absolute', bottom: 200, left: 300, width: 50, height: 50, borderRadius: 9999, background: 'radial-gradient(circle, #FF69B440, transparent)', }} />

        {/* Gem icon */}
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 9999,
            background: 'radial-gradient(circle, #FFD700, #D4A574)',
            boxShadow: '0 0 40px #FFD70066',
            marginBottom: 25,
          }}
        />

        {/* Score */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 700,
            color: '#FFD700',
            letterSpacing: 10,
            textShadow: '0 0 60px #FFD70040',
            lineHeight: 1,
            marginBottom: 10,
          }}
        >
          {score}
        </div>

        {/* Game name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: '#D4A574',
            letterSpacing: 12,
            marginBottom: 15,
          }}
        >
          SHINE
        </div>

        {/* Challenge */}
        <div
          style={{
            fontSize: 28,
            color: '#2D9596',
            letterSpacing: 8,
          }}
        >
          CAN YOU BEAT ME?
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 22,
            color: '#ffffff',
            letterSpacing: 6,
            opacity: 0.5,
          }}
        >
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #FFD700', borderLeft: '3px solid #FFD700' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #FFD700', borderRight: '3px solid #FFD700' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #FFD700', borderLeft: '3px solid #FFD700' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #FFD700', borderRight: '3px solid #FFD700' }} />
      </div>
    ),
    { ...size }
  );
}
