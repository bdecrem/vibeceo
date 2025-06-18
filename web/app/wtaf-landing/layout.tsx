import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.wtaf.me'),
  title: 'VOLTAGE - Electric Ink • Sunset Strip',
  description: 'Where rebellion meets artistry. Custom tattoos that channel your inner voltage in the heart of West Hollywood. Bold blackwork, electric colors, flash pieces, and expert cover-ups.',
  openGraph: {
    title: 'VOLTAGE - Electric Ink • Sunset Strip',
    description: 'Where rebellion meets artistry. Custom tattoos that channel your inner voltage in the heart of West Hollywood.',
    type: 'website',
    siteName: 'VOLTAGE Tattoo',
    url: 'https://www.wtaf.me',
    images: [
      {
        url: 'https://www.wtaf.me/images/voltage-og.png',
        width: 1024,
        height: 1024,
        alt: 'VOLTAGE - Electric Ink Tattoo Parlor on Sunset Strip',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VOLTAGE - Electric Ink • Sunset Strip',
    description: 'Where rebellion meets artistry. Custom tattoos that channel your inner voltage in West Hollywood.',
    images: ['https://www.wtaf.me/images/voltage-og.png']
  }
};

export default function WtafLandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}