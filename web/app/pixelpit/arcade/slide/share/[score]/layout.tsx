import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const score = params.score;

  return {
    title: `${score}m - SLIDE`,
    description: `I slid ${score}m before nightfall! Can you go farther?`,
    openGraph: {
      title: `${score}m - SLIDE`,
      description: `I slid ${score}m before nightfall! Can you go farther?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${score}m - SLIDE`,
      description: `${score}m before nightfall. Can you go farther?`,
    },
  };
}

export default function SlideShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
