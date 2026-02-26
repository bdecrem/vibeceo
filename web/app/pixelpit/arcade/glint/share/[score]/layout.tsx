import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ score: string }> }): Promise<Metadata> {
  const { score } = await params;
  return {
    title: `GLINT – Score ${score}`,
    description: `I scored ${score} on GLINT! Can you beat me? Play now on PixelPit Arcade.`,
    openGraph: {
      title: `GLINT – Score ${score}`,
      description: `I scored ${score} on GLINT! Can you beat me?`,
      siteName: 'PixelPit Arcade',
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
