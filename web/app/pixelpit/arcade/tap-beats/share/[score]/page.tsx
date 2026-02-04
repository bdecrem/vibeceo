'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/tap-beats');
  }, [router]);

  return (
    <div style={{
      background: '#09090b',
      color: '#ec4899',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: 2,
    }}>
      loading...
    </div>
  );
}
