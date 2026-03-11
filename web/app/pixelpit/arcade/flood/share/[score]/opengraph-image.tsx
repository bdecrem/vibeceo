import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  OG_SIZE,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'FLOOD Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const p = await params;
  return new ImageResponse(
    createScoreShareImage({
      score: p.score,
      gameName: 'FLOOD',
      tagline: 'CAN YOU BEAT ME? 🎨',
      colors: {
        background: '#FFF8F0',
        primary: '#FF6B6B',
        secondary: '#A55EEA',
        accent: '#FECA57',
        branding: '#2D343640',
      },
    }),
    { ...size }
  );
}
