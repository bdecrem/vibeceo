import { ImageResponse } from 'next/og';
import { createScoreShareImage, OG_SIZE } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'BOOST Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    createScoreShareImage({
      score,
      gameName: 'BOOST',
      tagline: 'CAN YOU GO FASTER?',
      colors: {
        background: '#0f172a',
        primary: '#fbbf24',
        secondary: '#22d3ee',
        accent: '#ec4899',
        branding: '#f8fafc',
      },
    }),
    { ...size }
  );
}