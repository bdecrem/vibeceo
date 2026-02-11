import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const score = params.score;

  return {
    title: `Score ${score} - SWOOP CI`,
    description: `I scored ${score} on SWOOP CI! Can you fly higher?`,
    openGraph: {
      title: `Score ${score} - SWOOP CI`,
      description: `I scored ${score} on SWOOP CI! Can you fly higher?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Score ${score} - SWOOP CI`,
      description: `Score ${score}. Can you fly higher?`,
    },
  };
}

export default function SwoopCiShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
