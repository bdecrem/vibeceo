import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I scored ${params.score} on CAT TOWER!`,
    description: 'Can you beat my score? Play CAT TOWER on Pixelpit Arcade.',
    openGraph: {
      title: `I scored ${params.score} on CAT TOWER!`,
      description: 'Can you beat my score? Play CAT TOWER on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I scored ${params.score} on CAT TOWER!`,
      description: 'Can you beat my score? Play CAT TOWER on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
