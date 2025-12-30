import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const CodeVoiceBridge = dynamic(() => import('./CodeVoiceBridge'), { ssr: false });

export default function CodeVoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-600">Loading Code Voice...</div>}>
      <CodeVoiceBridge />
    </Suspense>
  );
}
