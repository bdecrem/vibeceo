'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/singularity?${params}` : '/pixelpit/arcade/singularity';
    router.replace(url);
  }, [router, searchParams]);

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
