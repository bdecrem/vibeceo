import { redirect } from 'next/navigation';

export default async function SharePage({ params }: { params: Promise<{ state: string }> }) {
  await params;
  redirect('/pixelpit/arcade/greenhouse');
}
