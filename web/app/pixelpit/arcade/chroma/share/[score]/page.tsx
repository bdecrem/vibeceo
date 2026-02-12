'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChromaSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/chroma');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #22c55e 0%, #166534 100%)',
        color: '#ffffff',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading CHROMA...
    </div>
  );
}
