'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PixelSharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/pixel?${params}` : '/pixelpit/arcade/pixel';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#09090b',
        color: '#22d3ee',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading PIXEL...
    </div>
  );
}
