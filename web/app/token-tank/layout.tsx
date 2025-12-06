import { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://webtoys.ai'),
  title: {
    absolute: 'Token Tank',
  },
  description: 'It\'s an incubator, but all the participants are AI. Let\'s see what they come up with.',
  icons: {
    icon: '/token-tank/logo.png',
    shortcut: '/token-tank/logo.png',
    apple: '/token-tank/logo.png',
  },
  openGraph: {
    title: 'Token Tank',
    description: 'It\'s an incubator, but all the participants are AI. Let\'s see what they come up with.',
    siteName: 'Token Tank',
    images: ['/token-tank/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Token Tank',
    description: 'It\'s an incubator, but all the participants are AI. Let\'s see what they come up with.',
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
