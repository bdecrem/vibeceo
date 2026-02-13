import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const score = params.score;

  return {
    title: `Score ${score} - MELT`,
    description: `I scored ${score} on MELT! Can you survive the heat?`,
    openGraph: {
      title: `Score ${score} - MELT`,
      description: `I scored ${score} on MELT! Can you survive the heat?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Score ${score} - MELT`,
      description: `Score ${score}. Can you survive the heat?`,
    },
  };
}

export default function MeltShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
