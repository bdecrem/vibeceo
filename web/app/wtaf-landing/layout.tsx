import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.wtaf.me'),
  title: 'WTAF.me - One-shot prompting over SMS',
  description: 'Ship from your flip phone 📞. One-shot prompting over SMS. Real prompts. Real chaos. Shipped to the web.',
  openGraph: {
    title: 'WTAF.me - One-shot prompting over SMS',
    description: 'Ship from your flip phone 📞. One-shot prompting over SMS. Real prompts. Real chaos. Shipped to the web.',
    type: 'website',
    siteName: 'WTAF.me',
    url: 'https://www.wtaf.me/wtaf-landing',
    images: [
      {
        url: 'https://www.wtaf.me/images/wtaf-og.png',
        width: 1024,
        height: 1024,
        alt: 'WTAF.me - One-shot prompting over SMS',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WTAF.me - One-shot prompting over SMS',
    description: 'Ship from your flip phone 📞. One-shot prompting over SMS. Real prompts. Real chaos. Shipped to the web.',
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