'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SlideSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/slide');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(#fdf4ff, #fce7f3)',
        color: '#18181b',
        fontFamily: 'ui-rounded, system-ui, sans-serif',
      }}
    >
      Loading SLIDE...
    </div>
  );
}
