'use client';

import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const VOICES = {
  kora: { name: 'Kora', id: '59cfc7ab-e945-43de-ad1a-471daa379c67' },
  colton: { name: 'Colton Rivers', id: 'd8ab67c6-953d-4bd8-9370-8fa53a0f1453' },
};

// Context from amberx (video/content explanation)
interface AmberxContext {
  title: string;
  summary: string;
  fullText: string;
  metadata: {
    full_explanation?: string;
  };
}

// Context from drawer (Amber's persona/memory)
interface DrawerContext {
  systemPrompt: string;
  context: string;
}

function VoiceChatAmberInner() {
  const searchParams = useSearchParams();
  const amberxId = searchParams?.get('id') || searchParams?.get('amberx_id') || null;

  const { connect, disconnect, readyState } = useVoice();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [amberxContext, setAmberxContext] = useState<AmberxContext | null>(null);
  const [drawerContext, setDrawerContext] = useState<DrawerContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch access token
  useEffect(() => {
    fetch('/api/hume-token')
      .then((res) => res.json())
      .then((data) => setAccessToken(data.accessToken))
      .catch(console.error);
  }, []);

  // Fetch context based on mode
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (amberxId) {
      // Mode: Discussing specific content
      fetch(`/api/amberx-content?id=${amberxId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Content not found');
          return res.json();
        })
        .then((data) => {
          setAmberxContext(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      // Mode: General Amber chat - load drawer context
      fetch('/api/amber-context')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load Amber context');
          return res.json();
        })
        .then((data) => {
          setDrawerContext(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [amberxId]);

  const handleStart = useCallback(async () => {
    if (!accessToken) return;

    // Determine system prompt and context based on mode
    let systemPrompt: string;
    let contextText: string;

    if (amberxContext) {
      systemPrompt = `You are Amber with kochi.to. You just explained a video to the user. You have access to the full transcript and summary below. Answer their follow-up questions about this content. Be conversational and helpful. When someone asks who you are, say "I'm Amber with kochi.to".`;
      contextText = `# ${amberxContext.title}\n\n## Summary\n${amberxContext.summary}\n\n## Full Transcript\n${amberxContext.fullText}`;
    } else if (drawerContext) {
      systemPrompt = drawerContext.systemPrompt;
      contextText = drawerContext.context;
    } else {
      systemPrompt = `You are Amber with kochi.to. When someone asks who you are, always say "I'm Amber with kochi.to". Keep responses brief and conversational.`;
      contextText = '';
    }

    // Pass context directly in connect (like the working /voice-chat does)
    await connect({
      auth: { type: 'accessToken', value: accessToken },
      sessionSettings: {
        voice: { id: VOICES.colton.id },
        system_prompt: systemPrompt,
        context: contextText ? {
          text: contextText,
          type: 'persistent'
        } : undefined,
      } as any,
    });
  }, [accessToken, connect, amberxContext, drawerContext]);

  const isConnected = readyState === VoiceReadyState.OPEN;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        {amberxContext ? `Talk to Amber about: ${amberxContext.title}` : 'Talk to Amber'}
      </h1>

      {loading && <p className="text-gray-500 mb-4">Loading context...</p>}
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {amberxContext && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <strong>Summary:</strong> {amberxContext.summary.slice(0, 150)}...
        </div>
      )}

      {!amberxId && drawerContext && !loading && (
        <div className="mb-4 p-3 bg-amber-50 rounded text-sm text-amber-800">
          Amber's full context loaded from the drawer.
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={isConnected ? disconnect : handleStart}
          disabled={!accessToken || loading}
          className="bg-amber-600 text-white px-6 py-3 rounded-lg text-lg disabled:opacity-50 hover:bg-amber-700"
        >
          {isConnected ? 'Stop' : 'Start Talking'}
        </button>
        <span className="ml-4 text-gray-600">{readyState}</span>
      </div>
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
