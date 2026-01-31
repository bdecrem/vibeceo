import { ImageResponse } from 'next/og';
import { OG_SIZE, CornerAccents, PixelpitBranding, GAME_COLORS } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'POP - Chain Reaction Bubble Game';
export const size = OG_SIZE;
export const contentType = 'image/png';

const COLORS = GAME_COLORS.pop;

// Bubble decorations following Satori-safe patterns
function PopDecorations() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
      {/* Ambient glow at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: 'linear-gradient(180deg, #0f172a00 0%, #ec489920 100%)',
        }}
      />

      {/* Pink bubble cluster - top left */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 100,
          width: 55,
          height: 55,
          borderRadius: 27,
          background: 'linear-gradient(135deg, #ffffff 0%, #ec4899 30%, #ec4899 100%)',
          opacity: 0.8,
          border: '2px solid #00000080',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 165,
          width: 45,
          height: 45,
          borderRadius: 22,
          background: 'linear-gradient(135deg, #ffffff 0%, #ec4899 30%, #ec4899 100%)',
          opacity: 0.7,
          border: '2px solid #00000080',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 160,
          width: 40,
          height: 40,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #ffffff 0%, #ec4899 30%, #ec4899 100%)',
          opacity: 0.6,
          border: '2px solid #00000080',
        }}
      />

      {/* Cyan cluster - top right */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          right: 110,
          width: 50,
          height: 50,
          borderRadius: 25,
          background: 'linear-gradient(135deg, #ffffff 0%, #22d3ee 30%, #22d3ee 100%)',
          opacity: 0.8,
          border: '2px solid #00000080',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 140,
          right: 170,
          width: 42,
          height: 42,
          borderRadius: 21,
          background: 'linear-gradient(135deg, #ffffff 0%, #22d3ee 30%, #22d3ee 100%)',
          opacity: 0.7,
          border: '2px solid #00000080',
        }}
      />

      {/* Yellow bubbles - bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 130,
          left: 140,
          width: 48,
          height: 48,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #ffffff 0%, #fbbf24 30%, #fbbf24 100%)',
          opacity: 0.75,
          border: '2px solid #00000080',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 110,
          right: 150,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: 'linear-gradient(135deg, #ffffff 0%, #34d399 30%, #34d399 100%)',
          opacity: 0.7,
          border: '2px solid #00000080',
        }}
      />

      {/* Pop effect rings */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 280,
          width: 80,
          height: 80,
          borderRadius: 40,
          border: '3px solid #ec489960',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          right: 260,
          width: 70,
          height: 70,
          borderRadius: 35,
          border: '3px solid #22d3ee60',
        }}
      />
    </div>
  );
}

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.background,
          position: 'relative',
        }}
      >
        <PopDecorations />
        <CornerAccents color={COLORS.primary} />

        {/* Title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 'bold',
            color: COLORS.primary,
            textShadow: `4px 4px 0 ${COLORS.secondary}`,
            letterSpacing: 12,
            display: 'flex',
          }}
        >
          POP
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: COLORS.secondary,
            marginTop: 20,
            letterSpacing: 4,
            display: 'flex',
          }}
        >
          CHAIN REACTION BUBBLES
        </div>

        {/* Scoring info */}
        <div
          style={{
            fontSize: 24,
            color: COLORS.accent,
            marginTop: 40,
            letterSpacing: 2,
            display: 'flex',
          }}
        >
          Chain 2 = 10pts • Chain 5 = 100pts • Chain 10+ = 500pts
        </div>

        <PixelpitBranding color={COLORS.branding} />
      </div>
    ),
    { ...OG_SIZE }
  );
}
