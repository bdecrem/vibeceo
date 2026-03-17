import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I served ${params.score} customers on SUSHI MGR!`,
    description: 'Can you keep up? Play SUSHI MGR on Pixelpit Arcade.',
    openGraph: {
      title: `I served ${params.score} customers on SUSHI MGR!`,
      description: 'Can you keep up? Play SUSHI MGR on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I served ${params.score} customers on SUSHI MGR!`,
      description: 'Can you keep up? Play SUSHI MGR on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
