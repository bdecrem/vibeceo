import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.wtaf.me'),
  title: 'Featured - WEBTOYS',
  description: 'Curated collection of the best web toys. Handpicked digital chaos that actually works.',
  openGraph: {
    title: 'Featured - WEBTOYS',
    description: 'Curated collection of the best web toys. Handpicked digital chaos that actually works.',
    type: 'website',
    siteName: 'WEBTOYS',
    url: 'https://www.wtaf.me/featured',
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
    title: 'Featured - WEBTOYS',
    description: 'Curated collection of the best web toys. Handpicked digital chaos that actually works.',
    images: ['https://www.wtaf.me/images/webtoys-og.png']
  }
};

export default function FeaturedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}