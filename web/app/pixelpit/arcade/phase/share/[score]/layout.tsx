import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I cleared ${params.score} gears on PHASE!`,
    description: 'Can you phase through more? Play PHASE on Pixelpit Arcade.',
    openGraph: {
      title: `I cleared ${params.score} gears on PHASE!`,
      description: 'Can you phase through more? Play PHASE on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I cleared ${params.score} gears on PHASE!`,
      description: 'Can you phase through more? Play PHASE on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
