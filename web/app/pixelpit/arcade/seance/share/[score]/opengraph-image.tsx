import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  SeanceDecorations,
  OG_SIZE,
  GAME_COLORS,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'SÉANCE Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    createScoreShareImage({
      score,
      gameName: 'SÉANCE',
      tagline: 'CAN YOU ESCAPE?',
      colors: GAME_COLORS.seance,
      decorations: <SeanceDecorations />,
    }),
    { ...size }
  );
}
