import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  CatTowerDecorations,
  OG_SIZE,
  GAME_COLORS,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'CAT TOWER Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    createScoreShareImage({
      score,
      gameName: 'CAT TOWER',
      tagline: 'CAN YOU BEAT ME?',
      colors: GAME_COLORS.catTower,
      decorations: <CatTowerDecorations />,
    }),
    { ...size }
  );
}
