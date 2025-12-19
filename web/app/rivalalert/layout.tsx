import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RivalAlert - Get alerted when your rivals move',
  description: 'Stop manually checking competitor websites. We monitor pricing, features, and job postings—and tell you when something changes. $29-49/mo.',
  openGraph: {
    title: 'RivalAlert - Competitor Intelligence for Startups',
    description: 'Get alerted when competitors change pricing, features, or hiring. Enterprise intelligence at startup pricing.',
    siteName: 'RivalAlert',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RivalAlert - Get alerted when your rivals move',
    description: 'Stop manually checking competitor websites. We monitor pricing, features, and job postings.',
  },
};

export default function RivalAlertLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
