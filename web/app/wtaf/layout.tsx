import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WTAF - Vibecoding over SMS',
  description: 'Code directly from your flip phone with our SMS-based coding assistant',
  openGraph: {
    title: 'WTAF - Vibecoding over SMS',
    description: 'Code directly from your flip phone with our SMS-based coding assistant',
    url: 'https://advisorsfoundry.ai/wtaf',
    siteName: 'AdvisorsFoundry',
    images: [
      {
        url: '/images/wtaf-og.png',
        width: 1200,
        height: 630,
        alt: 'What if vibecoding, but over SMS?',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WTAF - Vibecoding over SMS',
    description: 'Code directly from your flip phone with our SMS-based coding assistant',
    images: ['/images/wtaf-og.png'],
    creator: '@theafbot',
  },
};

export default function WtafLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="wtaf-container">
      {children}
    </div>
  );
}
