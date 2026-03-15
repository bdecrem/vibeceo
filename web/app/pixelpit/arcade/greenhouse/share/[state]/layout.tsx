import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;
  const count = state.split(',').filter(Boolean).length;
  return {
    title: `FLOWERCRAFT – ${count}/21 Varieties`,
    description: `I've discovered ${count} out of 21 flower varieties in Flowercraft! Play now on PixelPit Arcade.`,
    openGraph: {
      title: `FLOWERCRAFT – ${count}/21 Varieties`,
      description: `I've discovered ${count}/21 flower varieties!`,
      siteName: 'PixelPit Arcade',
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
