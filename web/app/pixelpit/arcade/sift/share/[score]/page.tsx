'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/sift?${params}` : '/pixelpit/arcade/sift';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div style={{
      background: '#0a0a0a',
      color: '#a3e635',
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