import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const score = params.score;

  return {
    title: `${score} Stars - SWARM`,
    description: `I collected ${score} stars in SWARM! Can you guide the bees to the basket?`,
    openGraph: {
      title: `${score} Stars - SWARM`,
      description: `I collected ${score} stars in SWARM! Can you guide the bees to the basket?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${score} Stars - SWARM`,
      description: `${score} stars. Can you guide the bees to the basket?`,
    },
  };
}

export default function SwarmShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
