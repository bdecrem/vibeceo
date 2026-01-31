import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  OG_SIZE,
  GAME_COLORS,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'POP Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

const COLORS = GAME_COLORS.pop;

// Pop-specific decorations: bubbles and pop effect rings
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
          top: 70,
          left: 90,
          width: 50,
          height: 50,
          borderRadius: 25,
          background: 'linear-gradient(135deg, #ffffff 0%, #ec4899 30%, #ec4899 100%)',
          opacity: 0.8,
          border: '2px solid #00000080',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 105,
          left: 150,
          width: 42,
          height: 42,
          borderRadius: 21,
          background: 'linear-gradient(135deg, #ffffff 0%, #ec4899 30%, #ec4899 100%)',
          opacity: 0.7,
          border: '2px solid #00000080',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 55,
          left: 145,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: 'linear-gradient(135deg, #ffffff 0%, #ec4899 30%, #ec4899 100%)',
          opacity: 0.6,
          border: '2px solid #00000080',
        }}
      />

      {/* Cyan cluster - top right */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 100,
          width: 48,
          height: 48,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #ffffff 0%, #22d3ee 30%, #22d3ee 100%)',
          opacity: 0.8,
          border: '2px solid #00000080',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 125,
          right: 155,
          width: 40,
          height: 40,
          borderRadius: 20,
          background: 'linear-gradient(135deg, #ffffff 0%, #22d3ee 30%, #22d3ee 100%)',
          opacity: 0.7,
          border: '2px solid #00000080',
        }}
      />

      {/* Yellow/Green bubbles - bottom corners */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 120,
          width: 44,
          height: 44,
          borderRadius: 22,
          background: 'linear-gradient(135deg, #ffffff 0%, #fbbf24 30%, #fbbf24 100%)',
          opacity: 0.75,
          border: '2px solid #00000080',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          right: 130,
          width: 46,
          height: 46,
          borderRadius: 23,
          background: 'linear-gradient(135deg, #ffffff 0%, #34d399 30%, #34d399 100%)',
          opacity: 0.7,
          border: '2px solid #00000080',
        }}
      />

      {/* Pop effect rings */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 250,
          width: 70,
          height: 70,
          borderRadius: 35,
          border: '3px solid #ec489960',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 160,
          right: 220,
          width: 60,
          height: 60,
          borderRadius: 30,
          border: '3px solid #22d3ee60',
        }}
      />
    </div>
  );
}

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    createScoreShareImage({
      score,
      gameName: 'POP',
      tagline: 'CAN YOU BEAT MY CHAINS?',
      colors: COLORS,
      decorations: <PopDecorations />,
    }),
    { ...size }
  );
}
