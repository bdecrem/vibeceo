import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const score = params.score;
  const survived = score === '60' ? 'the full 60 seconds' : `${score} seconds`;

  return {
    title: `Survived ${survived} - CATCH`,
    description: `I survived ${survived} on CATCH! Light kills, shadows heal. Can you beat me?`,
    openGraph: {
      title: `Survived ${survived} - CATCH`,
      description: `I survived ${survived} on CATCH! Light kills, shadows heal. Can you beat me?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Survived ${survived} - CATCH`,
      description: `I survived ${survived} on CATCH! Can you beat me?`,
    },
  };
}

export default function CatchShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
