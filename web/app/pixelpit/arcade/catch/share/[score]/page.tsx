'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CatchSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/catch');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#000',
        color: '#22d3ee',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading CATCH...
    </div>
  );
}
