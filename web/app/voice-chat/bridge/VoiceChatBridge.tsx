'use client';

import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { useState, useEffect, useCallback } from 'react';

// Get config ID from Hume dashboard for SUNDAY config
const EVI_CONFIG_ID = process.env.NEXT_PUBLIC_EVI_CONFIG_ID || '';

interface PreloadStatus {
  success: boolean;
  source: string;
  loadTimeMs: number;
  persona: number;
  memory: number;
  log: number;
}

function VoiceChatBridgeInner() {
  const { connect, disconnect, readyState, messages } = useVoice();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus | null>(null);

  useEffect(() => {
    // Fetch Hume token
    fetch('/api/hume-token')
      .then((res) => res.json())
      .then((data) => setAccessToken(data.accessToken))
      .catch(console.error);

    // Preload: Sync Supabase → local drawer files (once at startup)
    fetch('/api/amber-voice/preload', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        console.log('[preload] Synced:', data);
        setPreloadStatus(data);
      })
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

      {preloadStatus && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
          <div className="font-medium text-green-800 mb-1">
            Preloaded from {preloadStatus.source} ({preloadStatus.loadTimeMs}ms)
          </div>
          <div className="text-green-700 text-xs space-y-0.5">
            <div>Persona: {preloadStatus.persona.toLocaleString()} chars</div>
            <div>Memory: {preloadStatus.memory.toLocaleString()} chars</div>
            <div>Log: {preloadStatus.log.toLocaleString()} chars</div>
          </div>
        </div>
      )}

      {!EVI_CONFIG_ID && (
        <p className="text-red-500 mb-4 text-sm">
          Missing NEXT_PUBLIC_EVI_CONFIG_ID. Get it from Hume dashboard → SUNDAY config → Copy Config ID
        </p>
      )}

      <div className="mb-4">
        <button
          onClick={isConnected ? disconnect : handleStart}
          disabled={!accessToken || !EVI_CONFIG_ID || !preloadStatus?.success}
          className="bg-amber-600 text-white px-6 py-3 rounded-lg text-lg disabled:opacity-50 hover:bg-amber-700"
        >
          {isConnected ? 'Stop' : preloadStatus ? 'Start Talking' : 'Loading...'}
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
