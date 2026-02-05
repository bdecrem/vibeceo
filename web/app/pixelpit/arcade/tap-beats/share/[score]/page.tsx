'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/tap-beats?${params}` : '/pixelpit/arcade/tap-beats';
    router.replace(url);
  }, [router, searchParams]);

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
