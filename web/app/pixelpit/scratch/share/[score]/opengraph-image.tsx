import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Pixelpit Neon Playroom colors
const COLORS = {
  bg: '#0f172a',          // Dark background
  surface: '#1e293b',     // Card surface
  pink: '#ec4899',        // Hot pink primary
  cyan: '#22d3ee',        // Electric cyan secondary
  yellow: '#fbbf24',      // Amber yellow energy
  text: '#f8fafc',        // Light text
  muted: '#94a3b8',       // Muted text
};

export default async function Image({
  params,
}: {
  params: Promise<{ score: string }>;
}) {
  const { score } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          background: COLORS.bg,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 32px,
              ${COLORS.pink} 32px,
              ${COLORS.pink} 33px
            ), repeating-linear-gradient(
              90deg,
              transparent,
              transparent 32px,
              ${COLORS.pink} 32px,
              ${COLORS.pink} 33px
            )`,
          }}
        />

        {/* Content card */}
        <div
          style={{
            background: COLORS.surface,
            border: `4px solid ${COLORS.yellow}`,
            boxShadow: '8px 8px 0px 0px rgba(0,0,0,0.8)',
            padding: '50px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '25px',
          }}
        >
          {/* Star icon */}
          <div
            style={{
              fontSize: 80,
              color: COLORS.yellow,
              filter: `drop-shadow(0 0 20px ${COLORS.yellow}80)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ⭐
          </div>

          {/* Score */}
          <div
            style={{
              fontSize: 72,
              color: COLORS.yellow,
              fontWeight: 'bold',
              letterSpacing: '6px',
              textShadow: `4px 4px 0px rgba(0,0,0,0.8)`,
              fontFamily: 'monospace',
            }}
          >
            {String(score).padStart(6, '0')}
          </div>

          {/* Challenge text */}
          <div
            style={{
              fontSize: 28,
              color: COLORS.pink,
              letterSpacing: '3px',
              textAlign: 'center',
              lineHeight: 1.4,
              fontFamily: 'monospace',
            }}
          >
            CLICKS ON THE<br />
            BREATHING STAR
          </div>

          {/* Call to action */}
          <div
            style={{
              fontSize: 20,
              color: COLORS.cyan,
              letterSpacing: '2px',
              fontFamily: 'monospace',
            }}
          >
            CAN YOU DO BETTER?
          </div>

          {/* Pixelpit branding */}
          <div
            style={{
              fontSize: 18,
              letterSpacing: '2px',
              fontFamily: 'monospace',
              display: 'flex',
              gap: '6px',
            }}
          >
            <span style={{ color: COLORS.pink }}>PIXEL</span>
            <span style={{ color: COLORS.cyan }}>PIT</span>
            <span style={{ color: COLORS.muted }}>CREATURE</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}