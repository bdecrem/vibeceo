'use client';

import { VoiceProvider, useVoice } from '@humeai/voice-react';
import { useState, useEffect } from 'react';

function VoiceChat() {
  const {
    connect,
    disconnect,
    status,
    messages,
    isMuted,
    mute,
    unmute,
    error,
  } = useVoice();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Fetch access token on mount
  useEffect(() => {
    async function getToken() {
      try {
        const res = await fetch('/api/hume-token');
        if (!res.ok) throw new Error('Failed to get token');
        const data = await res.json();
        setAccessToken(data.accessToken);
      } catch (err) {
        setTokenError(err instanceof Error ? err.message : 'Token error');
      }
    }
    getToken();
  }, []);

  const handleConnect = () => {
    if (!accessToken) return;
    connect({
      auth: { type: 'accessToken', value: accessToken },
    });
  };

  const isConnected = status.value === 'connected';
  const isConnecting = status.value === 'connecting';

  // Get last few messages for display
  const recentMessages = messages.slice(-6);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Amber Voice</h1>
        <p className="text-slate-400">Powered by Hume EVI</p>
      </div>

      {/* Main button */}
      <button
        onClick={isConnected ? disconnect : handleConnect}
        disabled={isConnecting || !accessToken}
        className={`w-32 h-32 rounded-full text-white flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 ${
          isConnected
            ? 'bg-green-600 hover:bg-green-700 animate-pulse'
            : isConnecting
              ? 'bg-yellow-500 cursor-wait'
              : tokenError
                ? 'bg-red-500'
                : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isConnecting ? (
          <svg className="w-12 h-12 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {/* Status */}
      <p className="mt-6 text-lg text-white">
        {tokenError
          ? `Error: ${tokenError}`
          : !accessToken
            ? 'Loading...'
            : isConnecting
              ? 'Connecting...'
              : isConnected
                ? 'Connected - just speak!'
                : 'Tap to connect'}
      </p>

      {/* Mute button when connected */}
      {isConnected && (
        <button
          onClick={isMuted ? unmute : mute}
          className={`mt-4 px-4 py-2 rounded ${
            isMuted ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          {isMuted ? '🔇 Muted' : '🎤 Mic On'}
        </button>
      )}

      {/* Error display */}
      {error && (
        <p className="mt-4 text-red-400 text-sm max-w-xs text-center">
          {error.message}
        </p>
      )}

      {/* Transcript */}
      {recentMessages.length > 0 && (
        <div className="mt-6 w-full max-w-md bg-slate-800 rounded-lg p-4 max-h-64 overflow-y-auto">
          {recentMessages.map((msg, i) => (
            <div key={i} className="mb-2">
              {msg.type === 'user_message' && (
                <p className="text-sm text-blue-300">
                  🗣️ {msg.message.content}
                </p>
              )}
              {msg.type === 'assistant_message' && (
                <p className="text-sm text-green-300">
                  🤖 {msg.message.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 text-center text-slate-500 text-sm max-w-xs">
        <p>
          {isConnected
            ? 'Speak naturally. Hume detects when you talk.'
            : 'Tap the button to start a voice conversation.'}
        </p>
      </div>
    </main>
  );
}

export default function VoiceChatPage() {
  return (
    <VoiceProvider>
      <VoiceChat />
    </VoiceProvider>
  );
}
