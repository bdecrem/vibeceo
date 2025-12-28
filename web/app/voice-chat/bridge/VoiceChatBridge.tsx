'use client';

import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { useState, useEffect, useCallback, useRef } from 'react';

// Get config ID from Hume dashboard for SUNDAY config
const EVI_CONFIG_ID = process.env.NEXT_PUBLIC_EVI_CONFIG_ID || '';

function VoiceChatBridgeInner() {
  const { connect, disconnect, readyState, messages, error } = useVoice();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Fetch token (with refresh capability)
  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch('/api/hume-token');
      const data = await res.json();
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch (err) {
      console.error('Failed to fetch token:', err);
      setConnectionError('Failed to get access token');
      return null;
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Handle connection errors and attempt reconnect
  useEffect(() => {
    if (error) {
      console.error('[VoiceBridge] Error:', error);
      setConnectionError(error.message || 'Connection error');

      // Attempt reconnect on certain errors
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        console.log(`[VoiceBridge] Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);

        setTimeout(async () => {
          // Refresh token and reconnect
          const newToken = await fetchToken();
          if (newToken) {
            try {
              await connect({
                auth: { type: 'accessToken', value: newToken },
                configId: EVI_CONFIG_ID,
              });
              setConnectionError(null);
              reconnectAttempts.current = 0;
            } catch (e) {
              console.error('[VoiceBridge] Reconnect failed:', e);
            }
          }
        }, 1000 * reconnectAttempts.current); // Exponential backoff
      }
    }
  }, [error, connect, fetchToken]);

  // Reset reconnect counter on successful connection
  useEffect(() => {
    if (readyState === VoiceReadyState.OPEN) {
      reconnectAttempts.current = 0;
      setConnectionError(null);
    }
  }, [readyState]);

  const handleStart = useCallback(async () => {
    if (!accessToken) {
      const newToken = await fetchToken();
      if (!newToken) return;
    }

    try {
      await connect({
        auth: { type: 'accessToken', value: accessToken! },
        configId: EVI_CONFIG_ID,
      });
    } catch (e) {
      console.error('[VoiceBridge] Connect failed:', e);
      setConnectionError('Failed to connect');
    }
  }, [accessToken, connect, fetchToken]);

  const handleStop = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
  }, [disconnect]);

  const isConnected = readyState === VoiceReadyState.OPEN;
  const isConnecting = readyState === VoiceReadyState.CONNECTING;

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

      {connectionError && (
        <p className="text-orange-600 mb-4 text-sm">
          {connectionError}
          {reconnectAttempts.current > 0 && ` (Reconnecting ${reconnectAttempts.current}/${maxReconnectAttempts}...)`}
        </p>
      )}

      <div className="mb-4">
        <button
          onClick={isConnected ? handleStop : handleStart}
          disabled={!accessToken || !EVI_CONFIG_ID || isConnecting}
          className="bg-amber-600 text-white px-6 py-3 rounded-lg text-lg disabled:opacity-50 hover:bg-amber-700"
        >
          {isConnecting ? 'Connecting...' : isConnected ? 'Stop' : 'Start Talking'}
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
