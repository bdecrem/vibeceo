'use client';

import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { useState, useEffect, useCallback } from 'react';

const VOICES = {
  kora: { name: 'Kora', id: '59cfc7ab-e945-43de-ad1a-471daa379c67' },
  colton: { name: 'Colton Rivers', id: 'd8ab67c6-953d-4bd8-9370-8fa53a0f1453' },
};

function VoiceChatInner() {
  const { connect, disconnect, readyState, messages } = useVoice();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/hume-token')
      .then((res) => res.json())
      .then((data) => setAccessToken(data.accessToken))
      .catch(console.error);
  }, []);

  const handleStart = useCallback(async () => {
    if (!accessToken) return;
    await connect({
      auth: { type: 'accessToken', value: accessToken },
      sessionSettings: {
        voice: { id: VOICES.colton.id },
        system_prompt: 'You are Amber, a friendly and witty assistant. When someone asks who you are, always introduce yourself as Amber. Keep responses brief and conversational.',
      } as any,
    });
  }, [accessToken, connect]);

  const isConnected = readyState === VoiceReadyState.OPEN;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Voice Chat</h1>

      <div className="mb-4">
        <button
          onClick={isConnected ? disconnect : handleStart}
          disabled={!accessToken}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg"
        >
          {isConnected ? 'Stop' : 'Start'}
        </button>
        <span className="ml-4 text-gray-600">{readyState}</span>
      </div>

      <div className="border rounded p-4 h-80 overflow-y-auto bg-gray-50">
        {messages.map((m, i) => {
          if (m.type === 'user_message' || m.type === 'assistant_message') {
            return (
              <div key={i} className="mb-2">
                <strong>{m.message.role}:</strong> {m.message.content}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default function VoiceChat() {
  return (
    <VoiceProvider>
      <VoiceChatInner />
    </VoiceProvider>
  );
}
