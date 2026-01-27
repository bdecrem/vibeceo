import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  OG_SIZE,
  GAME_COLORS,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'RAIN Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    createScoreShareImage({
      score,
      gameName: 'RAIN',
      tagline: 'CAN YOU CATCH MORE?',
      colors: GAME_COLORS.rain,
    }),
    { ...size }
  );
}
