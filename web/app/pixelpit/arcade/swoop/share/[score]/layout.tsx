import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const score = params.score;

  return {
    title: `Score ${score} - SWOOP`,
    description: `I scored ${score} on SWOOP! Can you fly higher?`,
    openGraph: {
      title: `Score ${score} - SWOOP`,
      description: `I scored ${score} on SWOOP! Can you fly higher?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Score ${score} - SWOOP`,
      description: `Score ${score}. Can you fly higher?`,
    },
  };
}

export default function SwoopShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
