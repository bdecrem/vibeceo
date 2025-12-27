import dynamic from 'next/dynamic';

const VoiceChatAmber = dynamic(() => import('./VoiceChatAmber'), { ssr: false });

export default function VoiceChatAmberPage() {
  return <VoiceChatAmber />;
}
