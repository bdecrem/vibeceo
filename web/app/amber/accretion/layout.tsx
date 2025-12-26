import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Amber Accretion',
  description: 'A shared amber that grows as words drift in and get preserved. Everyone\'s contributions accumulate together.',
  openGraph: {
    title: 'Amber Accretion',
    description: 'A shared amber that grows with everyone\'s words.',
    type: 'website',
  },
};

export default function AccretionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
