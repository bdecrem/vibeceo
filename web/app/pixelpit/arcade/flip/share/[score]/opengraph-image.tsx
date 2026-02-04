import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  FlipDecorations,
  OG_SIZE,
  GAME_COLORS,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'FLIP Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    createScoreShareImage({
      score,
      gameName: 'FLIP',
      tagline: 'CAN YOU BEAT ME?',
      colors: GAME_COLORS.flip,
      decorations: <FlipDecorations />,
    }),
    { ...size }
  );
}
