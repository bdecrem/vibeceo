'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SwoopCiSharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/swoop-ci');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(#87CEEB, #f0f9ff)',
        color: '#18181b',
        fontFamily: 'ui-rounded, system-ui, sans-serif',
      }}
    >
      Loading SWOOP...
    </div>
  );
}
