import { Metadata } from 'next';
import { getGameName } from '@/lib/pixelpit/game-names';

export async function generateMetadata({ params }: { params: { game: string; score: string } }): Promise<Metadata> {
  const name = getGameName(params.game);
  return {
    title: `I scored ${params.score} on ${name}!`,
    description: `Can you beat my score? Play ${name} on Pixelpit Arcade.`,
    openGraph: {
      title: `I scored ${params.score} on ${name}!`,
      description: `Can you beat my score? Play ${name} on Pixelpit Arcade.`,
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I scored ${params.score} on ${name}!`,
      description: `Can you beat my score? Play ${name} on Pixelpit Arcade.`,
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
