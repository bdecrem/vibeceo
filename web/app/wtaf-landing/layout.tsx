import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.wtaf.me'),
  title: 'WTAF.me',
  description: 'One-shot prompting over SMS. Ship from your flip phone. Vibecoded chaos delivered instantly.',
  openGraph: {
    title: 'WTAF.me',
    description: 'One-shot prompting over SMS. Ship from your flip phone. Vibecoded chaos delivered instantly.',
    type: 'website',
    siteName: 'WTAF',
    url: 'https://www.wtaf.me',
    images: [
      {
        url: 'https://www.wtaf.me/images/wtaf-og.png',
        width: 1200,
        height: 630,
        alt: 'WTAF - One-shot prompting over SMS',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WTAF.me',
    description: 'One-shot prompting over SMS. Ship from your flip phone. Vibecoded chaos delivered instantly.',
    images: ['https://www.wtaf.me/images/wtaf-og.png']
  }
};

export default function WtafLandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}