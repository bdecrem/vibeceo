import type { Metadata } from 'next';

const description = 'AI blasts delivered daily. Weather permitting.';

export const metadata: Metadata = {
  title: 'Kochi - Podcast Player',
  description,
  icons: {
    icon: '/kochi/icon.png',
    shortcut: '/kochi/icon.png',
    apple: '/kochi/icon.png',
  },
  openGraph: {
    title: 'Kochi - Podcast Player',
    description,
    type: 'website',
    siteName: 'Kochi.to',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kochi - Podcast Player',
    description,
  },
};

export default function MusicPlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
