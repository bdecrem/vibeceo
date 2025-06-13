import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WTAF – Delusional App Generator',
  description: 'Vibecoded chaos, shipped via SMS. Text us your wildest app ideas and get back absolute unhinged web apps.',
  openGraph: {
    title: 'WTAF by AF',
    description: 'Vibecoded chaos, shipped via SMS.',
    url: 'https://wtaf.me',
    siteName: 'AdvisorsFoundry',
    images: [
      {
        url: '/images/wtaf-og.png',
        width: 1200,
        height: 630,
        alt: 'WTAF - Delusional App Generator by AdvisorsFoundry',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WTAF – Delusional App Generator',
    description: 'Vibecoded chaos, shipped via SMS.',
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
