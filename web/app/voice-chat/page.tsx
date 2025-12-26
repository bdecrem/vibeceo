'use client';

import { VoiceProvider, useVoice } from '@humeai/voice-react';
import { useState, useEffect, useCallback, useRef } from 'react';

const HUME_CONFIG_ID = process.env.NEXT_PUBLIC_HUME_EVI_CONFIG_ID;
const DEFAULT_SESSION_SETTINGS = {
  type: 'session_settings' as const,
  systemPrompt:
    "You're Amber, Kochi's warm research guide. Keep answers under three sentences, cite any podcasts or papers you reference, and stay conversational yet precise.",
};

// Hume EVI voice options (from https://api.hume.ai/v0/tts/voices?provider=HUME_AI)
const VOICES = {
  kora: { name: 'Kora', id: '59cfc7ab-e945-43de-ad1a-471daa379c67' }, // Female, Young, California - EVI default
  colton: { name: 'Colton Rivers', id: 'd8ab67c6-953d-4bd8-9370-8fa53a0f1453' }, // Male, American/Southern
} as const;

type VoiceKey = keyof typeof VOICES;

type TokenInfo = {
  token: string;
  expiresAt: number; // epoch millis
};

function VoiceChat() {
  const { connect, disconnect, status, messages, isMuted, mute, unmute, error, sendSessionSettings } = useVoice();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [currentVoice, setCurrentVoice] = useState<VoiceKey>('kora');
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const switchVoice = useCallback((voiceKey: VoiceKey) => {
    const voice = VOICES[voiceKey];
    setCurrentVoice(voiceKey);
    sendSessionSettings({ voiceId: voice.id });
    console.log(`[VoiceChat] sendSessionSettings({ voiceId: "${voice.id}" }) for ${voice.name}`);
  }, [sendSessionSettings]);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const fetchToken = useCallback(async () => {
    setIsFetchingToken(true);
    setTokenError(null);
    try {
      const response = await fetch('/api/hume-token', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to get token');
      }
      const data = await response.json();
      if (!data?.accessToken) {
        throw new Error('Token payload missing accessToken');
      }

      const expiresIn = typeof data.expiresIn === 'number' ? data.expiresIn : 1800; // default 30m
      const expiresAt = Date.now() + expiresIn * 1000;
      setTokenInfo({ token: data.accessToken, expiresAt });

      clearRefreshTimer();
      const refreshDelay = Math.max(expiresIn - 90, 300); // refresh ~90s before expiry, min 5m
      refreshTimerRef.current = setTimeout(() => {
        void fetchToken();
      }, refreshDelay * 1000);
    } catch (err) {
      console.error('Failed to fetch Hume token:', err);
      setTokenInfo(null);
      setTokenError(err instanceof Error ? err.message : 'Token error');
      clearRefreshTimer();
    } finally {
      setIsFetchingToken(false);
    }
  }, [clearRefreshTimer]);

  useEffect(() => {
    void fetchToken();
    return () => {
      clearRefreshTimer();
    };
  }, [fetchToken, clearRefreshTimer]);

  const ensureFreshToken = useCallback(() => {
    if (!tokenInfo) {
      if (!isFetchingToken) void fetchToken();
      setTokenError('Missing Hume token');
      return false;
    }

    const timeRemaining = tokenInfo.expiresAt - Date.now();
    if (timeRemaining <= 15_000) {
      if (!isFetchingToken) void fetchToken();
      setTokenError('Refreshing Hume token...');
      return false;
    }

    return true;
  }, [tokenInfo, isFetchingToken, fetchToken]);

  const handleConnect = useCallback(async () => {
    if (!ensureFreshToken() || !tokenInfo) return;

    try {
      await connect({
        auth: { type: 'accessToken', value: tokenInfo.token },
        sessionSettings: DEFAULT_SESSION_SETTINGS,
        ...(HUME_CONFIG_ID ? { configId: HUME_CONFIG_ID } : {}),
      });
    } catch (err) {
      console.error('Failed to connect to Hume:', err);
    }
  }, [connect, ensureFreshToken, tokenInfo]);

  const isConnected = status.value === 'connected';
  const isConnecting = status.value === 'connecting';
  const tokenValid = tokenInfo ? tokenInfo.expiresAt - Date.now() > 5_000 : false;
  const connectDisabled = isConnecting || isFetchingToken || !tokenValid;

  const recentMessages = messages.slice(-6);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Amber Voice</h1>
        <p className="text-slate-400">Powered by Hume EVI</p>
      </div>

      <button
        onClick={isConnected ? disconnect : handleConnect}
        disabled={connectDisabled}
        className={`w-32 h-32 rounded-full text-white flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 ${
          isConnected
            ? 'bg-green-600 hover:bg-green-700 animate-pulse'
            : isConnecting
              ? 'bg-yellow-500 cursor-wait'
              : tokenError
                ? 'bg-red-500'
                : connectDisabled
                  ? 'bg-slate-600'
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

      <p className="mt-6 text-lg text-white">
        {tokenError
          ? `Error: ${tokenError}`
          : isFetchingToken && !tokenInfo
            ? 'Loading Hume token...'
            : isConnecting
              ? 'Connecting...'
              : isConnected
                ? 'Connected - just speak!'
                : tokenValid
                  ? 'Tap to connect'
                  : 'Preparing Amber Voice...'}
      </p>

      {isConnected && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={isMuted ? unmute : mute}
            className={`px-4 py-2 rounded ${
              isMuted ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {isMuted ? '🔇 Muted' : '🎤 Mic On'}
          </button>

          <div className="flex gap-2 mt-2">
            <span className="text-slate-400 text-sm self-center">Voice:</span>
            {(Object.keys(VOICES) as VoiceKey[]).map((key) => (
              <button
                key={key}
                onClick={() => switchVoice(key)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  currentVoice === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {VOICES[key].name}
              </button>
            ))}
          </div>
        </div>
      )}

      {(error || tokenError) && (
        <p className="mt-4 text-red-400 text-sm max-w-xs text-center">
          {tokenError ?? error?.message}
        </p>
      )}

      {recentMessages.length > 0 && (
        <div className="mt-6 w-full max-w-md bg-slate-800 rounded-lg p-4 max-h-64 overflow-y-auto">
          {recentMessages.map((msg, i) => (
            <div key={i} className="mb-2">
              {msg.type === 'user_message' && (
                <p className="text-sm text-blue-300">🗣️ {msg.message.content}</p>
              )}
              {msg.type === 'assistant_message' && (
                <p className="text-sm text-green-300">🤖 {msg.message.content}</p>
              )}
            </div>
          ))}
        </div>
      )}

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
    <VoiceProvider clearMessagesOnDisconnect messageHistoryLimit={100}>
      <VoiceChat />
    </VoiceProvider>
  );
}
