import { redirect } from 'next/navigation';

export default async function SharePage({ params }: { params: Promise<{ score: string }> }) {
  await params;
  redirect('/pixelpit/arcade/claim');
}
