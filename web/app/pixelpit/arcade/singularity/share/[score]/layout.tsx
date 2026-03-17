import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I reached level ${params.score} on SINGULARITY!`,
    description: 'Can you match my score? Play SINGULARITY on Pixelpit Arcade.',
    openGraph: {
      title: `I reached level ${params.score} on SINGULARITY!`,
      description: 'Can you match my score? Play SINGULARITY on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I reached level ${params.score} on SINGULARITY!`,
      description: 'Can you match my score? Play SINGULARITY on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
