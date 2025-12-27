'use client';

import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const VOICES = {
  kora: { name: 'Kora', id: '59cfc7ab-e945-43de-ad1a-471daa379c67' },
  colton: { name: 'Colton Rivers', id: 'd8ab67c6-953d-4bd8-9370-8fa53a0f1453' },
};

interface AmberContext {
  title: string;
  summary: string;
  fullText: string;
  metadata: {
    full_explanation?: string;
  };
}

function VoiceChatAmberInner() {
  const searchParams = useSearchParams();
  const amberxId = searchParams?.get('id') || searchParams?.get('amberx_id') || null;

  const { connect, disconnect, readyState, sendSessionSettings } = useVoice();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [amberContext, setAmberContext] = useState<AmberContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextSent, setContextSent] = useState(false);

  // Fetch access token
  useEffect(() => {
    fetch('/api/hume-token')
      .then((res) => res.json())
      .then((data) => setAccessToken(data.accessToken))
      .catch(console.error);
  }, []);

  // Fetch amber context if ID provided
  useEffect(() => {
    if (!amberxId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/amberx-content?id=${amberxId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Content not found');
        return res.json();
      })
      .then((data) => {
        setAmberContext(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [amberxId]);

  const handleStart = useCallback(async () => {
    if (!accessToken) return;

    // Connect WITHOUT context in URL (context sent after connection opens)
    await connect({
      auth: { type: 'accessToken', value: accessToken },
      sessionSettings: {
        voice: { id: VOICES.colton.id },
        system_prompt: amberContext
          ? `You are Amber with kochi.to. You just explained a video to the user. You have access to the full transcript and summary below. Answer their follow-up questions about this content. Be conversational and helpful. When someone asks who you are, say "I'm Amber with kochi.to".`
          : `You are Amber with kochi.to. When someone asks who you are, always say "I'm Amber with kochi.to". Keep responses brief and conversational.`,
      } as any,
    });
  }, [accessToken, connect, amberContext]);

  // Send context AFTER connection opens (avoids URL length limits)
  useEffect(() => {
    if (readyState === VoiceReadyState.OPEN && amberContext && !contextSent) {
      const contextText = `# ${amberContext.title}\n\n## Summary\n${amberContext.summary}\n\n## Full Transcript\n${amberContext.fullText}`;

      sendSessionSettings({
        context: {
          text: contextText,
          type: 'persistent'
        }
      } as any);

      setContextSent(true);
    }
  }, [readyState, amberContext, contextSent, sendSessionSettings]);

  const isConnected = readyState === VoiceReadyState.OPEN;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        {amberContext ? `Talk to Amber about: ${amberContext.title}` : 'Amber Voice Chat'}
      </h1>

      {loading && <p className="text-gray-500 mb-4">Loading content...</p>}
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {amberContext && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <strong>Summary:</strong> {amberContext.summary.slice(0, 150)}...
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={isConnected ? disconnect : handleStart}
          disabled={!accessToken || loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg disabled:opacity-50"
        >
          {isConnected ? 'Stop' : 'Start Talking'}
        </button>
        <span className="ml-4 text-gray-600">{readyState}</span>
      </div>

      {!amberxId && (
        <p className="text-gray-500 text-sm">
          Tip: Add ?id=xxx to load content from amberx
        </p>
      )}
    </div>
  );
}

export default function VoiceChatAmber() {
  return (
    <VoiceProvider>
      <VoiceChatAmberInner />
    </VoiceProvider>
  );
}
