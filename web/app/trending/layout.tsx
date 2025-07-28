import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.wtaf.me'),
  title: 'Trending - WEBTOYS',
  description: 'Viral experiments and trending web toys. See what\'s breaking the internet in a good way.',
  openGraph: {
    title: 'Trending - WEBTOYS',
    description: 'Viral experiments and trending web toys. See what\'s breaking the internet in a good way.',
    type: 'website',
    siteName: 'WEBTOYS',
    url: 'https://www.wtaf.me/trending',
    images: [
      {
        url: 'https://www.wtaf.me/images/webtoys-og.png',
        width: 1200,
        height: 630,
        alt: 'WEBTOYS - Ship from your flip phone',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trending - WEBTOYS',
    description: 'Viral experiments and trending web toys. See what\'s breaking the internet in a good way.',
    images: ['https://www.wtaf.me/images/webtoys-og.png']
  }
};

export default function TrendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}