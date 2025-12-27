'use client';

import { useState, useRef } from 'react';
import { HumeEVIClient } from '@/lib/hume-evi';

export default function VoiceChat() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'recording'>('idle');
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<HumeEVIClient | null>(null);

  const handleStart = async () => {
    setError(null);
    setStatus('connecting');

    try {
      // Get token
      const res = await fetch('/api/hume-token');
      const { accessToken } = await res.json();
      if (!accessToken) throw new Error('No token');

      // Create client
      const client = new HumeEVIClient({
        accessToken,
        systemPrompt: 'You are a helpful assistant. Be concise.',
        onConnected: () => {
          setStatus('connected');
          // Auto-start recording
          client.startRecording().then(() => setStatus('recording'));
        },
        onDisconnected: () => setStatus('idle'),
        onError: (err) => setError(err.message),
        onUserMessage: (text) => setMessages((m) => [...m, { role: 'user', text }]),
        onAssistantMessage: (text) => setMessages((m) => [...m, { role: 'assistant', text }]),
      });

      clientRef.current = client;
      await client.connect();
    } catch (err: any) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const handleStop = () => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus('idle');
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Voice Chat</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="mb-4">
        <button
          onClick={status === 'idle' ? handleStart : handleStop}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg"
        >
          {status === 'idle' ? 'Start' : status === 'connecting' ? 'Connecting...' : 'Stop'}
        </button>
        <span className="ml-4 text-gray-600">{status}</span>
      </div>

      <div className="border rounded p-4 h-80 overflow-y-auto bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className="mb-2">
            <strong>{m.role}:</strong> {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}
