'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Neon Playroom colors
const COLORS = {
  bg: '#0f172a',
  primary: '#ec4899',
};

export default function SharePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pixelpit/arcade/pop');
  }, [router]);

  return (
    <div style={{
      background: COLORS.bg,
      color: COLORS.primary,
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
