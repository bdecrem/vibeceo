import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.wtaf.me'),
  title: 'Recents - WEBTOYS',
  description: 'The latest web toys and experiments. Fresh creations from the WEBTOYS community.',
  openGraph: {
    title: 'Recents - WEBTOYS',
    description: 'The latest web toys and experiments. Fresh creations from the WEBTOYS community.',
    type: 'website',
    siteName: 'WEBTOYS',
    url: 'https://www.wtaf.me/recents',
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
    title: 'Recents - WEBTOYS',
    description: 'The latest web toys and experiments. Fresh creations from the WEBTOYS community.',
    images: ['https://www.wtaf.me/images/webtoys-og.png']
  }
};

export default function RecentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}