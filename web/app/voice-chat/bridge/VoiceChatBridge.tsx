'use client';

import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { useState, useEffect, useCallback, useRef } from 'react';

// Get config ID from Hume dashboard for SUNDAY config
const EVI_CONFIG_ID = process.env.NEXT_PUBLIC_EVI_CONFIG_ID || '';

function VoiceChatBridgeInner() {
  const { connect, disconnect, readyState, messages, error } = useVoice();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadStatus, setPreloadStatus] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const wasConnected = useRef(false);
  const intentionalDisconnect = useRef(false);

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

  // Track connection state and auto-reconnect on unexpected disconnect
  useEffect(() => {
    if (readyState === VoiceReadyState.OPEN) {
      // Successfully connected
      wasConnected.current = true;
      reconnectAttempts.current = 0;
      setConnectionError(null);
      setIsReconnecting(false);
      console.log('[VoiceBridge] Connected');
    } else if (readyState === VoiceReadyState.CLOSED && wasConnected.current && !intentionalDisconnect.current) {
      // Unexpected disconnect - try to reconnect
      console.log('[VoiceBridge] Unexpected disconnect, attempting reconnect...');

      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        setIsReconnecting(true);
        setConnectionError(`Connection lost. Reconnecting (${reconnectAttempts.current}/${maxReconnectAttempts})...`);

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 10000); // Exponential backoff, max 10s

        setTimeout(async () => {
          const newToken = await fetchToken();
          if (newToken) {
            try {
              await connect({
                auth: { type: 'accessToken', value: newToken },
                configId: EVI_CONFIG_ID,
              });
            } catch (e) {
              console.error('[VoiceBridge] Reconnect failed:', e);
            }
          }
        }, delay);
      } else {
        setConnectionError('Connection lost. Please click Start to reconnect.');
        setIsReconnecting(false);
        wasConnected.current = false;
      }
    }
  }, [readyState, connect, fetchToken]);

  // Preload Amber's context before connecting (cached server-side)
  const preloadContext = useCallback(async (): Promise<boolean> => {
    setIsPreloading(true);
    setPreloadStatus('Loading Amber\'s memory...');

    try {
      const res = await fetch('/api/amber-voice/preload', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to preload');
      }

      setPreloadStatus(`Context loaded (${data.loadTimeMs}ms)`);
      console.log('[VoiceBridge] Preloaded context:', data.stats);
      return true;
    } catch (e) {
      console.error('[VoiceBridge] Preload failed:', e);
      setPreloadStatus('Failed to load context');
      return false;
    }
  }, []);

  const handleStart = useCallback(async () => {
    // Reset disconnect tracking
    intentionalDisconnect.current = false;
    wasConnected.current = false;
    reconnectAttempts.current = 0;

    // Step 1: Preload context (cached server-side)
    const success = await preloadContext();
    if (!success) {
      setIsPreloading(false);
      setConnectionError('Failed to load Amber\'s context');
      return;
    }

    // Step 2: Get Hume token if needed
    setPreloadStatus('Connecting to voice...');
    let token = accessToken;
    if (!token) {
      token = await fetchToken();
      if (!token) {
        setIsPreloading(false);
        return;
      }
    }

    // Step 3: Connect to Hume (context is already cached server-side)
    try {
      await connect({
        auth: { type: 'accessToken', value: token },
        configId: EVI_CONFIG_ID,
      });
      setPreloadStatus(null);
    } catch (e) {
      console.error('[VoiceBridge] Connect failed:', e);
      setConnectionError('Failed to connect');
    } finally {
      setIsPreloading(false);
    }
  }, [accessToken, connect, fetchToken, preloadContext]);

  const handleStop = useCallback(() => {
    intentionalDisconnect.current = true;
    wasConnected.current = false;
    reconnectAttempts.current = 0;
    setIsReconnecting(false);
    disconnect();
  }, [disconnect]);

  const isConnected = readyState === VoiceReadyState.OPEN;
  const isConnecting = readyState === VoiceReadyState.CONNECTING;
  const isBusy = isPreloading || isConnecting || isReconnecting;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Talk to Amber</h1>

      <p className="text-gray-600 mb-4 text-sm">
        Voice chat with full memory context
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

      {preloadStatus && (
        <p className="text-amber-600 mb-4 text-sm animate-pulse">
          {preloadStatus}
        </p>
      )}

      <div className="mb-4">
        <button
          onClick={isConnected ? handleStop : handleStart}
          disabled={!accessToken || !EVI_CONFIG_ID || isBusy}
          className="bg-amber-600 text-white px-6 py-3 rounded-lg text-lg disabled:opacity-50 hover:bg-amber-700"
        >
          {isPreloading ? 'Loading...' : isReconnecting ? 'Reconnecting...' : isConnecting ? 'Connecting...' : isConnected ? 'Stop' : 'Start Talking'}
        </button>
        {isConnected && <span className="ml-4 text-green-600">● Connected</span>}
        {isReconnecting && <span className="ml-4 text-orange-500 animate-pulse">● Reconnecting...</span>}
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
