'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/sprout-run?${params}` : '/pixelpit/arcade/sprout-run';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div style={{
      background: 'linear-gradient(180deg, #fef3c7 0%, #a7f3d0 100%)',
      color: '#15803d',
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
