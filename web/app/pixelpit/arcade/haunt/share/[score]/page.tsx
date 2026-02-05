'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function HauntSharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/haunt?${params}` : '/pixelpit/arcade/haunt';
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
        color: '#7c3aed',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      Loading HAUNT...
    </div>
  );
}
