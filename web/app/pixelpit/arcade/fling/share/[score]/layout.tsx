import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ score: string }> }): Promise<Metadata> {
  const { score } = await params;
  return {
    title: `FLING – Score ${score}`,
    description: `I caught ${score} bugs on FLING! Can you beat me? Play now on PixelPit Arcade.`,
    openGraph: {
      title: `FLING – Score ${score}`,
      description: `I caught ${score} bugs on FLING! Can you beat me?`,
      siteName: 'PixelPit Arcade',
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
