'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PixelSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/pixel');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#09090b',
        color: '#22d3ee',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading PIXEL...
    </div>
  );
}
