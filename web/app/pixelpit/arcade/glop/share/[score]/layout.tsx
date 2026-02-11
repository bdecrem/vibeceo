import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const score = params.score;

  return {
    title: `Score ${score} - GLOP`,
    description: `I scored ${score} on GLOP! Can you make the KING SLIME?`,
    openGraph: {
      title: `Score ${score} - GLOP`,
      description: `I scored ${score} on GLOP! Can you make the KING SLIME?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Score ${score} - GLOP`,
      description: `Score ${score}. Can you make the KING SLIME?`,
    },
  };
}

export default function GlopShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
