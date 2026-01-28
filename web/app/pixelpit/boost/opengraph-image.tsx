import { createScoreShareImage, OG_SIZE, GAME_COLORS } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'Boost Game';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return await createScoreShareImage({
    title: 'BOOST',
    subtitle: 'Race through gates!',
    colors: {
      background: '#0f172a',
      primary: '#fbbf24',
      secondary: '#22d3ee',
      accent: '#ec4899',
      branding: '#f8fafc',
    }
  });
}