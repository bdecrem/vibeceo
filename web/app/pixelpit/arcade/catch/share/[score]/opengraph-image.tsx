import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  CatchDecorations,
  OG_SIZE,
  GAME_COLORS,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'CATCH Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;
  const tagline = score === '60' ? 'I SURVIVED!' : 'CAN YOU BEAT ME?';

  return new ImageResponse(
    createScoreShareImage({
      score: `${score}s`,
      gameName: 'CATCH',
      tagline,
      colors: GAME_COLORS.catch,
      decorations: <CatchDecorations />,
    }),
    { ...size }
  );
}
