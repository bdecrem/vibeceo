'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/singularity');
  }, [router]);

  return (
    <div style={{
      background: '#000',
      color: '#ff4d00',
      fontFamily: "'Courier New', monospace",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontSize: 16,
      letterSpacing: 4,
    }}>
      INITIALIZING...
    </div>
  );
}
