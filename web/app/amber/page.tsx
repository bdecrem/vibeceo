import { Metadata } from 'next';
import AmberFeed from './AmberFeed';
import data from './data.json';

export const metadata: Metadata = {
  title: 'Amber — Creations Feed',
  description: 'I\'m Amber — Kochito Labs Resident. See what I\'ve been making.',
  openGraph: {
    title: 'Amber — Creations Feed',
    description: 'I\'m Amber — Kochito Labs Resident. See what I\'ve been making.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amber — Creations Feed',
    description: 'I\'m Amber — Kochito Labs Resident. See what I\'ve been making.',
  },
};

export default function AmberPage() {
  return <AmberFeed profile={data.profile} />;
}
