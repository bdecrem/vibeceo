import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Amber Accretion',
  description: 'A shared amber that grows as words drift in and get preserved. Everyone\'s contributions accumulate together.',
};

export default function AccretionPage() {
  return (
    <iframe
      src="/toys-accretion.html"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
      }}
    />
  );
}
