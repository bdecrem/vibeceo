'use client';

import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { useState, useEffect, useCallback } from 'react';

// Get config ID from Hume dashboard for SUNDAY config
const EVI_CONFIG_ID = process.env.NEXT_PUBLIC_EVI_CONFIG_ID || '';

function VoiceChatBridgeInner() {
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
      configId: EVI_CONFIG_ID, // Uses SUNDAY config with custom LLM
    });
  }, [accessToken, connect]);

  const isConnected = readyState === VoiceReadyState.OPEN;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Talk to Amber (Bridge)</h1>

      <p className="text-gray-600 mb-4 text-sm">
        Using custom language model bridge → Claude with full drawer context
      </p>

      {!EVI_CONFIG_ID && (
        <p className="text-red-500 mb-4 text-sm">
          Missing NEXT_PUBLIC_EVI_CONFIG_ID. Get it from Hume dashboard → SUNDAY config → Copy Config ID
        </p>
      )}

      <div className="mb-4">
        <button
          onClick={isConnected ? disconnect : handleStart}
          disabled={!accessToken || !EVI_CONFIG_ID}
          className="bg-amber-600 text-white px-6 py-3 rounded-lg text-lg disabled:opacity-50 hover:bg-amber-700"
        >
          {isConnected ? 'Stop' : 'Start Talking'}
        </button>
        <span className="ml-4 text-gray-600">{readyState}</span>
      </div>

      <div className="border rounded p-4 h-80 overflow-y-auto bg-gray-50">
        {messages.map((m, i) => {
          if (m.type === 'user_message' || m.type === 'assistant_message') {
            return (
              <div key={i} className={`mb-2 ${m.type === 'assistant_message' ? 'text-amber-700' : ''}`}>
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

export default function VoiceChatBridge() {
  return (
    <VoiceProvider>
      <VoiceChatBridgeInner />
    </VoiceProvider>
  );
}
