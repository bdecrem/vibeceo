import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I earned ${params.score} stars on SÉANCE!`,
    description: 'Can you escape the haunted house? Play SÉANCE on Pixelpit Arcade.',
    openGraph: {
      title: `I earned ${params.score} stars on SÉANCE!`,
      description: 'Can you escape the haunted house? Play SÉANCE on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I earned ${params.score} stars on SÉANCE!`,
      description: 'Can you escape the haunted house? Play SÉANCE on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
