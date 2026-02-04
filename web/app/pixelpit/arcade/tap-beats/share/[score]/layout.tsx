import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I scored ${params.score} on TAP BEATS!`,
    description: 'Can you beat my score? Play TAP BEATS on Pixelpit Arcade.',
    openGraph: {
      title: `I scored ${params.score} on TAP BEATS!`,
      description: 'Can you beat my score? Play TAP BEATS on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I scored ${params.score} on TAP BEATS!`,
      description: 'Can you beat my score? Play TAP BEATS on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
