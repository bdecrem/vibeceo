'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/emoji');
  }, [router]);

  return (
    <div style={{
      background: 'linear-gradient(180deg, #fef3c7 0%, #fce7f3 100%)',
      color: '#ec4899',
      fontFamily: 'ui-monospace, monospace',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontSize: 24,
      letterSpacing: 4,
    }}>
      loading...
    </div>
  );
}
