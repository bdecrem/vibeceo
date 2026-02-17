import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  FlopDecorations,
  OG_SIZE,
  GAME_COLORS,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'FLOP Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    createScoreShareImage({
      score,
      gameName: 'FLOP',
      tagline: 'CAN YOU BEAT ME?',
      colors: GAME_COLORS.flop,
      decorations: <FlopDecorations />,
    }),
    { ...size }
  );
}
