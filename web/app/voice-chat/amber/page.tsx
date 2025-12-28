import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const VoiceChatAmber = dynamic(() => import('./VoiceChatAmber'), { ssr: false });

export default function VoiceChatAmberPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <VoiceChatAmber />
    </Suspense>
  );
}
