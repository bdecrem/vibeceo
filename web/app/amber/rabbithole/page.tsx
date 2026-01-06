import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Amber's Rabbit Hole",
  description: 'Fall down a Wikipedia rabbit hole. Start at a random page. Follow links. See where you end up.',
  openGraph: {
    title: "Amber's Rabbit Hole",
    description: 'From random page to random page. Where will you end up?',
    images: ['/amber/rabbithole/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Amber's Rabbit Hole",
    description: 'Fall down a Wikipedia rabbit hole. Watch chaos unfold.',
    images: ['/amber/rabbithole/og-image.png'],
  },
};

export default function RabbitHolePage() {
  return (
    <iframe
      src="/amber/toys-rabbithole.html"
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
