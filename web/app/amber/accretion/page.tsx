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

export default function AccretionPage() {
  // Cache bust with timestamp
  const cacheBust = `?v=${Date.now()}`;

  return (
    <iframe
      src={`/toys-accretion.html${cacheBust}`}
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
      title="Amber Accretion"
    />
  );
}
