import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: { score: string };
}

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: `RAIN Score: ${params.score} - Pixelpit Arcade`,
    description: `I caught ${params.score} drops in RAIN! Can you catch more?`,
    openGraph: {
      title: `RAIN Score: ${params.score}`,
      description: `I caught ${params.score} drops in RAIN! Can you catch more?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `RAIN Score: ${params.score}`,
      description: `I caught ${params.score} drops in RAIN! Can you catch more?`,
    },
  };
}

export default function SharePage({ params }: Props) {
  // Redirect to the game
  redirect('/pixelpit/arcade/rain');
}
