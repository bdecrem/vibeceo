import { ImageResponse } from 'next/og';
import { createScoreShareImage, ThreadsDecorations, OG_SIZE, GAME_COLORS } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'THREADS Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  return new ImageResponse(
    createScoreShareImage({
      score: params.score,
      gameName: 'THREADS',
      tagline: 'CAN YOU FIND THE GROUPS?',
      colors: GAME_COLORS.threads,
      decorations: <ThreadsDecorations />,
    }),
    { ...size }
  );
}
