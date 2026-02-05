'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CatchSharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/catch?${params}` : '/pixelpit/arcade/catch';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#000',
        color: '#22d3ee',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading CATCH...
    </div>
  );
}
