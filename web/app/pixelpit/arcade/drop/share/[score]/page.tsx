'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString() || '';
    const url = params ? `/pixelpit/arcade/drop?${params}` : '/pixelpit/arcade/drop';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div style={{
      background: 'linear-gradient(180deg, #87CEEB 0%, #4A8DB7 100%)',
      color: '#ffffff',
      fontFamily: '"SF Pro Rounded", "Nunito", system-ui, sans-serif',
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
