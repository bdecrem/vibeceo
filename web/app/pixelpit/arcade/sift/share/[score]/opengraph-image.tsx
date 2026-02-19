import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SIFT Score - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
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
        {/* Machine layers */}
        <div style={{ position: 'absolute', top: 100, left: 100, right: 100, height: 6, background: '#22d3ee', opacity: 0.3, boxShadow: '0 0 12px #22d3ee40' }} />
        <div style={{ position: 'absolute', top: 180, left: 150, right: 150, height: 6, background: '#22d3ee', opacity: 0.25 }} />
        <div style={{ position: 'absolute', bottom: 180, left: 150, right: 150, height: 6, background: '#22d3ee', opacity: 0.25 }} />
        <div style={{ position: 'absolute', bottom: 100, left: 100, right: 100, height: 6, background: '#22d3ee', opacity: 0.3, boxShadow: '0 0 12px #22d3ee40' }} />

        {/* Magnetic layer */}
        <div style={{ position: 'absolute', top: 250, left: 200, right: 200, height: 6, background: '#d946ef', opacity: 0.4, boxShadow: '0 0 15px #d946ef40' }} />

        {/* Mercury drop */}
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 9999,
            background: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 100%)',
            boxShadow: '0 0 40px #ffffff60, 0 0 80px #ffffff30',
            marginBottom: 20,
          }}
        />

        {/* Score */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: 10,
            textShadow: '0 0 60px #ffffff40',
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
            color: '#22d3ee',
            letterSpacing: 12,
            marginBottom: 15,
          }}
        >
          SIFT
        </div>

        {/* Challenge */}
        <div
          style={{
            fontSize: 28,
            color: '#a3e635',
            letterSpacing: 8,
          }}
        >
          CAN YOU GO DEEPER?
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
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '3px solid #facc15', borderLeft: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '3px solid #facc15', borderRight: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '3px solid #facc15', borderLeft: '3px solid #facc15' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '3px solid #facc15', borderRight: '3px solid #facc15' }} />
      </div>
    ),
    { ...size }
  );
}
