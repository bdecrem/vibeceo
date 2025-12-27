import dynamic from 'next/dynamic';

const VoiceChat = dynamic(() => import('./VoiceChat'), { ssr: false });

export default function VoiceChatPage() {
  return <VoiceChat />;
}
