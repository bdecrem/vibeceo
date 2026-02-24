import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I reached height ${params.score} on PAVE!`,
    description: 'Can you beat my score? Play PAVE on Pixelpit Arcade.',
    openGraph: {
      title: `I reached height ${params.score} on PAVE!`,
      description: 'Can you beat my score? Play PAVE on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I reached height ${params.score} on PAVE!`,
      description: 'Can you beat my score? Play PAVE on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
