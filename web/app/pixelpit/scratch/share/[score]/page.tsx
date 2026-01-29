import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ score: string }>;
}): Promise<Metadata> {
  const { score } = await params;

  return {
    title: `${score} clicks on the breathing star! - Pixelpit`,
    description: `I scored ${score} clicks on the pulsing yellow star that breathes slowly. Can you do better?`,
    openGraph: {
      title: `${score} clicks on the breathing star!`,
      description: `I scored ${score} clicks on the pulsing yellow star. Can you do better?`,
      type: 'website',
      images: [
        {
          url: `/pixelpit/scratch/share/${score}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `Score of ${score} on Star game`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${score} clicks on the breathing star!`,
      description: `I scored ${score} clicks on the pulsing yellow star. Can you do better?`,
      images: [`/pixelpit/scratch/share/${score}/opengraph-image`],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ score: string }>;
}) {
  const { score } = await params;

  // Validate score
  const scoreNum = parseInt(score);
  if (isNaN(scoreNum) || scoreNum < 0) {
    redirect('/pixelpit/scratch');
  }

  // Redirect to the main game
  redirect('/pixelpit/scratch');
}