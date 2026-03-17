import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I blasted ${params.score} on EMOJI BLASTER!`,
    description: 'Can you beat me? Play EMOJI BLASTER on Pixelpit Arcade.',
    openGraph: {
      title: `I blasted ${params.score} on EMOJI BLASTER!`,
      description: 'Can you beat me? Play EMOJI BLASTER on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I blasted ${params.score} on EMOJI BLASTER!`,
      description: 'Can you beat me? Play EMOJI BLASTER on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
