import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WTAF - Delusional App Generator',
  description: 'Build weird stuff via SMS. Share your chaos at wtaf.me/yourname',
  openGraph: {
    title: 'WTAF - Delusional App Generator',
    description: 'Build weird stuff via SMS. Share your chaos at wtaf.me/yourname',
    type: 'website',
    siteName: 'WTAF',
    images: [
      {
        url: '/images/wtaf-og.png',
        width: 1024,
        height: 1024,
        alt: 'WTAF - Delusional App Generator',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WTAF - Delusional App Generator',
    description: 'Build weird stuff via SMS. Share your chaos at wtaf.me/yourname',
    images: ['/images/wtaf-og.png']
  }
};

export default function WtafLandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 