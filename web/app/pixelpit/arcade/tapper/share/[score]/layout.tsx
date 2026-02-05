import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I tapped ${params.score} times on TAPPER!`,
    description: 'Can you beat my score? Play TAPPER on Pixelpit Arcade.',
    openGraph: {
      title: `I tapped ${params.score} times on TAPPER!`,
      description: 'Can you beat my score? Play TAPPER on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I tapped ${params.score} times on TAPPER!`,
      description: 'Can you beat my score? Play TAPPER on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
