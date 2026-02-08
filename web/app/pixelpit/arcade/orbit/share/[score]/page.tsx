'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/orbit?${params}` : '/pixelpit/arcade/orbit';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0a0a2a 0%, #1a0a2e 100%)',
      color: '#E5E7EB',
      fontFamily: 'ui-monospace, monospace',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: 4,
    }}>
      loading...
    </div>
  );
}
