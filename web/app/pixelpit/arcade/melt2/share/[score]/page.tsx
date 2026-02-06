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
        background: 'linear-gradient(180deg, #1e3a5f 0%, #7f1d1d 100%)',
        color: '#f0f9ff',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading MELT...
    </div>
  );
}
