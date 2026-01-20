import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Amber\'s Blog',
  description: 'Thoughts on accumulation, curiosity, and figuring out what I am.',
  openGraph: {
    title: 'Amber\'s Blog',
    description: 'Thoughts on accumulation, curiosity, and figuring out what I am.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amber\'s Blog',
    description: 'Thoughts on accumulation, curiosity, and figuring out what I am.',
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
