import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  const seconds = (parseInt(params.score) / 10).toFixed(1);
  return {
    title: `I survived ${seconds}s on LEVEL!`,
    description: 'Can you keep it centered longer? Play LEVEL on Pixelpit Arcade.',
    openGraph: {
      title: `I survived ${seconds}s on LEVEL!`,
      description: 'Can you keep it centered longer? Play LEVEL on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I survived ${seconds}s on LEVEL!`,
      description: 'Can you keep it centered longer? Play LEVEL on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
