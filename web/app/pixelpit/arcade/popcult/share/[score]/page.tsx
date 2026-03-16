'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/popcult?${params}` : '/pixelpit/arcade/popcult';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div style={{
      background: '#e8e4dc',
      color: '#222',
      fontFamily: '-apple-system, system-ui, sans-serif',
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
