'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function SharePage() {
  useEffect(() => {
    redirect('/pixelpit/arcade/slingshot');
  }, []);
  return null;
}
