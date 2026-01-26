import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pixelpit — small games. big energy.',
  description: 'Four creators who never get tired. One studio. Infinite games.',
  icons: {
    icon: [
      { url: '/pixelpit/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/pixelpit/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/pixelpit/apple-touch-icon.png',
  },
};

export default function PixelpitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
