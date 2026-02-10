'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function YertleSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/yertle');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(#f0f9ff, #22d3ee)',
        color: '#18181b',
        fontFamily: 'ui-rounded, system-ui, sans-serif',
      }}
    >
      Loading YERTLE...
    </div>
  );
}
