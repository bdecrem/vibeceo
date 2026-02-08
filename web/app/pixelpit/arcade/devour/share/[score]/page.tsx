'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DevourSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/devour');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #1a0a2e 0%, #020108 70%)',
        color: '#E5E7EB',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading DEVOUR...
    </div>
  );
}
