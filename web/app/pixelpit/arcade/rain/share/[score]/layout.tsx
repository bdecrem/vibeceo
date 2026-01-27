import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { score: string } }): Promise<Metadata> {
  return {
    title: `I caught ${params.score} drops in RAIN!`,
    description: 'Can you catch more? Play RAIN on Pixelpit Arcade.',
    openGraph: {
      title: `I caught ${params.score} drops in RAIN!`,
      description: 'Can you catch more? Play RAIN on Pixelpit Arcade.',
      siteName: 'Pixelpit',
    },
    twitter: {
      card: 'summary_large_image',
      title: `I caught ${params.score} drops in RAIN!`,
      description: 'Can you catch more? Play RAIN on Pixelpit Arcade.',
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
