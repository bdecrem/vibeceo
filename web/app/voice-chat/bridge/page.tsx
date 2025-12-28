import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const VoiceChatBridge = dynamic(() => import('./VoiceChatBridge'), { ssr: false });

export default function VoiceChatBridgePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <VoiceChatBridge />
    </Suspense>
  );
}
