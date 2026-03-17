import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  OG_SIZE,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'SUSHI MGR Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

const SUSHI_MGR_COLORS = {
  background: '#1a0a00',
  primary: '#FF8C42',
  secondary: '#FFD700',
  accent: '#E83F6F',
  branding: '#FF8C4280',
};

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    createScoreShareImage({
      score,
      gameName: 'SUSHI MGR',
      tagline: 'CAN YOU KEEP UP?',
      colors: SUSHI_MGR_COLORS,
    }),
    { ...size }
  );
}
