import dynamic from 'next/dynamic';

const VoiceChatClean = dynamic(() => import('./VoiceChatClean'), { ssr: false });

export default function VoiceChatCleanPage() {
  return <VoiceChatClean />;
}
