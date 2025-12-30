'use client';

import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

// Different EVI config for code discussions (professional/technical voice)
const CODE_EVI_CONFIG_ID = process.env.NEXT_PUBLIC_CODE_EVI_CONFIG_ID || '';

interface Investigation {
  question: string;
  summary: string;
  filesExamined: number;
  createdAt: string;
}

function CodeVoiceBridgeInner() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams?.get('s') || null;

  const { connect, disconnect, readyState, messages, error } = useVoice();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Validate session on load
  useEffect(() => {
    if (!sessionToken) {
      setSessionValid(false);
      return;
    }

    fetch(`/api/code-session?s=${sessionToken}`)
      .then(res => res.json())
      .then(data => {
        setSessionValid(data.valid);
        if (data.investigation) {
          setInvestigation(data.investigation);
        }
      })
      .catch(() => setSessionValid(false));
  }, [sessionToken]);

  // Fetch Hume token
  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch('/api/hume-token');
      const data = await res.json();
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch (err) {
      console.error('[code-voice] Failed to fetch token:', err);
      setConnectionError('Failed to get access token');
      return null;
    }
  }, []);

  useEffect(() => {
    if (sessionValid) fetchToken();
  }, [sessionValid, fetchToken]);

  // Handle connection errors and attempt reconnect
  useEffect(() => {
    if (error) {
      console.error('[code-voice] Error:', error);
      setConnectionError(error.message || 'Connection error');

      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        console.log(`[code-voice] Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);

        setTimeout(async () => {
          const newToken = await fetchToken();
          if (newToken && sessionToken) {
            try {
              await connect({
                auth: { type: 'accessToken', value: newToken },
                configId: CODE_EVI_CONFIG_ID,
              });
              setConnectionError(null);
              reconnectAttempts.current = 0;
            } catch (e) {
              console.error('[code-voice] Reconnect failed:', e);
            }
          }
        }, 1000 * reconnectAttempts.current);
      }
    }
  }, [error, connect, fetchToken, sessionToken]);

  // Reset reconnect counter on successful connection
  useEffect(() => {
    if (readyState === VoiceReadyState.OPEN) {
      reconnectAttempts.current = 0;
      setConnectionError(null);
    }
  }, [readyState]);

  const handleStart = useCallback(async () => {
    if (!sessionToken) return;

    let tokenToUse = accessToken;
    if (!tokenToUse) {
      tokenToUse = await fetchToken();
      if (!tokenToUse) return;
    }

    try {
      await connect({
        auth: { type: 'accessToken', value: tokenToUse },
        configId: CODE_EVI_CONFIG_ID,
      });
    } catch (e) {
      console.error('[code-voice] Connect failed:', e);
      setConnectionError('Failed to connect');
    }
  }, [accessToken, sessionToken, connect, fetchToken]);

  const handleStop = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
  }, [disconnect]);

  // Invalid or missing session
  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Invalid Session</h1>
          <p className="text-gray-300 mb-4">
            Session expired or invalid. Start a new investigation via SMS:
          </p>
          <code className="block bg-gray-800 p-4 rounded text-green-400 mb-4">
            CC how does the auth system work?
          </code>
          <p className="text-gray-400 text-sm">
            After investigation completes, reply <code className="text-green-400">CC VOICE</code> to get a new voice link.
          </p>
        </div>
      </div>
    );
  }

  // Loading session
  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-gray-400">Validating session...</div>
      </div>
    );
  }

  // Missing config
  if (!CODE_EVI_CONFIG_ID) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-yellow-400">Configuration Missing</h1>
          <p className="text-gray-300">
            Missing <code className="text-green-400">NEXT_PUBLIC_CODE_EVI_CONFIG_ID</code>.
            Create a new EVI config in the Hume dashboard and add the config ID to your environment.
          </p>
        </div>
      </div>
    );
  }

  const isConnected = readyState === VoiceReadyState.OPEN;
  const isConnecting = readyState === VoiceReadyState.CONNECTING;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Code Voice</h1>
        <p className="text-gray-400 text-sm mb-6">
          Discuss your codebase investigation via voice
        </p>

        {/* Investigation context */}
        {investigation && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Investigation</div>
            <p className="text-white font-medium mb-2">{investigation.question}</p>
            {investigation.summary && (
              <p className="text-gray-400 text-sm">{investigation.summary}</p>
            )}
            <div className="mt-2 text-xs text-gray-500">
              {investigation.filesExamined} files examined
            </div>
          </div>
        )}

        {/* Connection error */}
        {connectionError && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
            {connectionError}
            {reconnectAttempts.current > 0 && ` (Reconnecting ${reconnectAttempts.current}/${maxReconnectAttempts}...)`}
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={isConnected ? handleStop : handleStart}
            disabled={!accessToken || isConnecting}
            className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              isConnected
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isConnecting ? 'Connecting...' : isConnected ? 'End Discussion' : 'Start Voice Discussion'}
          </button>
          <span className="text-gray-500 text-sm">{readyState}</span>
        </div>

        {/* Conversation */}
        <div className="border border-gray-700 rounded-lg bg-gray-800 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              {isConnected ? 'Listening...' : 'Start a voice discussion to see the transcript'}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {messages.map((m, i) => {
                if (m.type === 'user_message' || m.type === 'assistant_message') {
                  const isAssistant = m.type === 'assistant_message';
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${
                        isAssistant
                          ? 'bg-blue-900/30 border border-blue-800'
                          : 'bg-gray-700'
                      }`}
                    >
                      <div className={`text-xs mb-1 ${isAssistant ? 'text-blue-400' : 'text-gray-400'}`}>
                        {isAssistant ? 'Assistant' : 'You'}
                      </div>
                      <div className="text-white">{m.message.content}</div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-gray-500">
          To investigate more, send <code className="text-green-400">CC &lt;question&gt;</code> via SMS
        </div>
      </div>
    </div>
  );
}

export default function CodeVoiceBridge() {
  return (
    <VoiceProvider>
      <CodeVoiceBridgeInner />
    </VoiceProvider>
  );
}
