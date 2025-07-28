import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { user_slug: string } }): Promise<Metadata> {
  return {
    metadataBase: new URL('https://www.wtaf.me'),
    title: `${params.user_slug}'s Creations - WEBTOYS`,
    description: `Check out all the web toys created by ${params.user_slug}. Ship from your flip phone.`,
    openGraph: {
      title: `${params.user_slug}'s Creations - WEBTOYS`,
      description: `Check out all the web toys created by ${params.user_slug}. Ship from your flip phone.`,
      type: 'website',
      siteName: 'WEBTOYS',
      url: `https://www.wtaf.me/wtaf/${params.user_slug}/creations`,
      images: [
        {
          url: 'https://www.wtaf.me/images/webtoys-og.png',
          width: 1200,
          height: 630,
          alt: 'WEBTOYS - Ship from your flip phone',
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${params.user_slug}'s Creations - WEBTOYS`,
      description: `Check out all the web toys created by ${params.user_slug}. Ship from your flip phone.`,
      images: ['https://www.wtaf.me/images/webtoys-og.png']
    }
  };
}

export default function CreationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}