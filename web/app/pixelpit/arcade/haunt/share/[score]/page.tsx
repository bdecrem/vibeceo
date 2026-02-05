'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HauntSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/haunt');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#09090b',
        color: '#7c3aed',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading HAUNT...
    </div>
  );
}
