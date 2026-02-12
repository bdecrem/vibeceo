import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const score = params.score;

  return {
    title: `${score}m - CHROMA`,
    description: `I climbed ${score}m in CHROMA! Can you match the colors and reach the treetops?`,
    openGraph: {
      title: `${score}m - CHROMA`,
      description: `I climbed ${score}m in CHROMA! Can you match the colors and reach the treetops?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${score}m - CHROMA`,
      description: `Climbed ${score}m. Can you reach the treetops?`,
    },
  };
}

export default function ChromaShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
