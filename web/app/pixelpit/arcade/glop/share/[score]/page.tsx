'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlopSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/glop');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#09090b',
        color: '#a3e635',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading GLOP...
    </div>
  );
}
