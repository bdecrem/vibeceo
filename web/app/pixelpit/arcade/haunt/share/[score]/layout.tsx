import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { score: string };
}): Promise<Metadata> {
  const touristsSaved = params.score;
  const won = touristsSaved === '5';

  return {
    title: won ? 'All Safe - HAUNT' : `Saved ${touristsSaved}/5 - HAUNT`,
    description: won 
      ? 'I protected all 5 tourists on HAUNT! Can you guide them safely?'
      : `I saved ${touristsSaved}/5 tourists on HAUNT. Can you do better?`,
    openGraph: {
      title: won ? 'All Safe - HAUNT' : `Saved ${touristsSaved}/5 - HAUNT`,
      description: won
        ? 'I protected all 5 tourists! Can you guide them safely?'
        : `I saved ${touristsSaved}/5 tourists. Can you do better?`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: won ? 'All Safe - HAUNT' : `Saved ${touristsSaved}/5 - HAUNT`,
      description: won
        ? 'All 5 tourists safe! Can you do it?'
        : `${touristsSaved}/5 tourists saved. Beat me?`,
    },
  };
}

export default function HauntShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
