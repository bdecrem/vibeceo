import { ImageResponse } from 'next/og';
import { createScoreShareImage, OG_SIZE } from '@/app/pixelpit/components/og/ScoreShareImage';
import { GAME_COLORS } from '@/app/pixelpit/components/og/utils';
import { getGameName } from '@/lib/pixelpit/game-names';

export const runtime = 'edge';
export const alt = 'Pixelpit Arcade Score';
export const size = OG_SIZE;
export const contentType = 'image/png';

// Default colors for games not yet in GAME_COLORS
const DEFAULT_COLORS = {
  background: '#0a0a0a',
  primary: '#a3e635',
  secondary: '#22d3ee',
  accent: '#facc15',
  branding: '#f8fafc',
};

// Map game slugs to GAME_COLORS keys (some use camelCase)
const COLOR_KEY_MAP: Record<string, string> = {
  'cat-tower': 'catTower',
  cattower: 'catTower',
  'sprout-run': 'sproutRun',
  'tap-beats': 'tapBeats',
};

function getColors(slug: string) {
  const key = COLOR_KEY_MAP[slug] || slug;
  return (GAME_COLORS as Record<string, typeof DEFAULT_COLORS>)[key] || DEFAULT_COLORS;
}

export default async function Image({ params }: { params: { game: string; score: string } }) {
  const colors = getColors(params.game);
  const gameName = getGameName(params.game);

  return new ImageResponse(
    createScoreShareImage({
      score: params.score,
      gameName,
      tagline: 'CAN YOU BEAT ME?',
      colors,
    }),
    { ...size }
  );
}
