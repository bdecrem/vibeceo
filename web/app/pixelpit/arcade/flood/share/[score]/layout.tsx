export async function generateMetadata({ params }: { params: { score: string } }) {
  const p = await params;
  return {
    title: `Score ${p.score} on FLOOD`,
    description: 'Can you beat me? Play FLOOD on Pixelpit Arcade. 🎨',
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
