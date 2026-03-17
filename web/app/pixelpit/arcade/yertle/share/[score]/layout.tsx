import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I stacked ${params.score} on YERTLE!`,
    description: 'Can you beat my stack? Play YERTLE on Pixelpit Arcade.',
    openGraph: {
      title: `I stacked ${params.score} on YERTLE!`,
      description: 'Can you beat my stack? Play YERTLE on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I stacked ${params.score} on YERTLE!`,
      description: 'Can you beat my stack? Play YERTLE on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
