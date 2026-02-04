import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const puzzlesSolved = params.score;

  return {
    title: `Solved ${puzzlesSolved} puzzles - PIXEL`,
    description: `I solved ${puzzlesSolved} puzzles on PIXEL! Can you beat me?`,
    openGraph: {
      title: `Solved ${puzzlesSolved} puzzles - PIXEL`,
      description: `I solved ${puzzlesSolved} puzzles on PIXEL! Can you beat me?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Solved ${puzzlesSolved} puzzles - PIXEL`,
      description: `I solved ${puzzlesSolved} puzzles on PIXEL! Can you beat me?`,
    },
  };
}

export default function PixelShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
