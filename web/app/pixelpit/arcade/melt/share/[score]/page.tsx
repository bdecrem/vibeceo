'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MeltSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/melt');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#000000',
        color: '#444444',
        fontFamily: 'ui-monospace, monospace',
        letterSpacing: '4px',
        fontSize: 12,
      }}
    >
      LOADING MELT...
    </div>
  );
}
