import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Amber Asks',
  description: 'A question. Your answer. Preserved forever.',
  openGraph: {
    title: 'Amber Asks',
    description: 'A question. Your answer. Preserved forever.',
    type: 'website',
  },
};

export default function AmberAsksPage() {
  return (
    <iframe
      src="/amber/amber-asks.html"
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
