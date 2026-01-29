import { fetchAccessToken } from 'hume';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with audio APIs
const VoiceChat = dynamic(() => import('@/components/VoiceChat'), {
  ssr: false,
});

export default async function VoiceChatPage() {
  const accessToken = await fetchAccessToken({
    apiKey: process.env.HUME_API_KEY || '',
    secretKey: process.env.HUME_SECRET_KEY || '',
  });

  if (!accessToken) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-red-400">Missing Hume API credentials</p>
      </main>
    );
  }

  return <VoiceChat accessToken={accessToken} />;
}
