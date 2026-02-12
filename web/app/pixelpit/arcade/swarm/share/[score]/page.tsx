'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SwarmSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/swarm');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #e0f2fe 0%, #f0fdf4 100%)',
        color: '#1e293b',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading SWARM...
    </div>
  );
}
