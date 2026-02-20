import { redirect } from 'next/navigation';

export default function SharePage({ params }: { params: { game: string; score: string } }) {
  redirect(`/pixelpit/arcade/${params.game}`);
}
