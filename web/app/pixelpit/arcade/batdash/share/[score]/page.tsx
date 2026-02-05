'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve query params (like ?ref=) when redirecting to game
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/batdash?${params}` : '/pixelpit/arcade/batdash';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div style={{
      background: '#020617',
      color: '#fef08a',
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
