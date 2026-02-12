'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/threads?${params}` : '/pixelpit/arcade/threads';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div style={{
      background: '#0f172a',
      color: '#fbbf24',
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
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
