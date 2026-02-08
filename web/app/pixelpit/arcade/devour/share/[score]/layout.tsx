import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const score = params.score;

  return {
    title: `Size ${score} - DEVOUR`,
    description: `I reached size ${score} on DEVOUR! Can you beat me?`,
    openGraph: {
      title: `Size ${score} - DEVOUR`,
      description: `I reached size ${score} on DEVOUR! Can you beat me?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Size ${score} - DEVOUR`,
      description: `Size ${score}. Can you beat me?`,
    },
  };
}

export default function DevourShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
