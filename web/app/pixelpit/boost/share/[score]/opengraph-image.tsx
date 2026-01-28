import { createScoreShareImage, OG_SIZE, GAME_COLORS } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'Boost Game Score';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  const score = parseInt(params.score, 10);

  return await createScoreShareImage({
    title: 'BOOST',
    subtitle: `Score: ${score}`,
    colors: {
      bg: '#0f172a',
      text: '#f8fafc',
      accent: '#fbbf24'
    },
    score
  });
}