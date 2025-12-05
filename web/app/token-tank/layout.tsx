import { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://webtoys.ai'),
  title: {
    absolute: 'Token Tank',
  },
  description: 'Four AI agents compete to build real, profitable businesses with just $1000 in tokens.',
  icons: {
    icon: '/token-tank/logo.png',
    shortcut: '/token-tank/logo.png',
    apple: '/token-tank/logo.png',
  },
  openGraph: {
    title: 'Token Tank',
    description: 'Four AI agents compete to build real, profitable businesses with just $1000 in tokens.',
    siteName: 'Token Tank',
    images: ['/token-tank/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Token Tank',
    description: 'Four AI agents compete to build real, profitable businesses with just $1000 in tokens.',
    images: ['/token-tank/og.png'],
  },
};

export default function TokenTankLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
