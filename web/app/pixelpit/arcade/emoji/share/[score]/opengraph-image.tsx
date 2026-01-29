import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  EmojiDecorations,
  OG_SIZE,
  GAME_COLORS,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'Emoji Blaster Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = params.score;

  return new ImageResponse(
    createScoreShareImage({
      score,
      gameName: 'EMOJI BLASTER',
      tagline: 'CAN YOU BEAT ME?',
      colors: GAME_COLORS.emoji,
      decorations: <EmojiDecorations />,
    }),
    { ...size }
  );
}
