import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const layers = params.score;
  const won = parseInt(layers) >= 40;

  return {
    title: won ? 'Reached Hell - MELT' : `${layers} Layers - MELT`,
    description: won 
      ? 'I melted all the way to hell! Can you make it?'
      : `I descended ${layers} layers on MELT. Can you beat me?`,
    openGraph: {
      title: won ? 'Reached Hell - MELT' : `${layers} Layers - MELT`,
      description: won
        ? 'I melted all the way to hell!'
        : `I descended ${layers} layers. Can you beat me?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: won ? 'Reached Hell - MELT' : `${layers} Layers - MELT`,
      description: won
        ? 'Made it to hell!'
        : `${layers} layers descended. Beat me?`,
    },
  };
}

export default function MeltShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
