import type { Metadata } from 'next';

const description = 'AI blasts delivered daily. Weather permitting.';

export const metadata: Metadata = {
  title: 'Kochi - AI Report Viewer',
  description,
  icons: {
    icon: '/kochi/icon.png',
    shortcut: '/kochi/icon.png',
    apple: '/kochi/icon.png',
  },
  openGraph: {
    title: 'Kochi - AI Report Viewer',
    description,
    type: 'website',
    siteName: 'Kochi.to',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kochi - AI Report Viewer',
    description,
  },
};

export default function ReportViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
