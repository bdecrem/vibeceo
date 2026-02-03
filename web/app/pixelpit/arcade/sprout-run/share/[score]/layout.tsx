import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I ran ${params.score}m in Sprout Run!`,
    description: 'Can you beat my distance? Play Sprout Run on Pixelpit Arcade.',
    openGraph: {
      title: `I ran ${params.score}m in Sprout Run!`,
      description: 'Can you beat my distance? Play Sprout Run on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I ran ${params.score}m in Sprout Run!`,
      description: 'Can you beat my distance? Play Sprout Run on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
