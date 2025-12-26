'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { HumeEVIClient } from '@/lib/hume-evi';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function VoiceChatPage() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Tap to connect');
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<HumeEVIClient | null>(null);

  const connect = useCallback(async () => {
    if (clientRef.current) {
      return;
    }

    setConnectionState('connecting');
    setStatus('Getting access token...');
    setError(null);

    try {
      // Get access token
      const tokenRes = await fetch('/api/hume-token');
      if (!tokenRes.ok) {
        throw new Error('Failed to get access token');
      }
      const { accessToken } = await tokenRes.json();

      setStatus('Connecting to Hume...');

      // Create client
      const client = new HumeEVIClient({
        accessToken,
        systemPrompt: "You're Amber, a friendly and knowledgeable AI assistant. Be conversational, warm, and helpful. Keep responses concise but substantive.",
        onConnected: () => {
          console.log('Connected to Hume EVI');
          setConnectionState('connected');
          setStatus('Connected! Tap mic to talk');
        },
        onDisconnected: () => {
          console.log('Disconnected from Hume EVI');
          setConnectionState('disconnected');
          setIsRecording(false);
          setStatus('Disconnected. Tap to reconnect');
          clientRef.current = null;
        },
        onError: (err) => {
          console.error('Hume EVI error:', err);
          setError(err.message);
          setConnectionState('error');
          setStatus('Error occurred');
        },
        onAssistantMessage: (text) => {
          console.log('Assistant:', text);
          setStatus('Speaking...');
        },
        onUserMessage: (text) => {
          console.log('You:', text);
          setStatus('Processing...');
        },
        onResponseFinished: () => {
          setStatus('Tap mic to talk');
        },
      });

      await client.connect();
      clientRef.current = client;

    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnectionState('error');
      setStatus('Connection failed');
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    if (isRecording) {
      client.stopRecording();
      setIsRecording(false);
      setStatus('Processing...');
    } else {
      try {
        await client.startRecording();
        setIsRecording(true);
        setStatus('Listening...');
      } catch (err) {
        console.error('Recording error:', err);
        setError('Microphone access denied');
      }
    }
  }, [isRecording]);

  const handleMainButtonClick = useCallback(async () => {
    if (connectionState === 'disconnected' || connectionState === 'error') {
      await connect();
    } else if (connectionState === 'connected') {
      await toggleRecording();
    }
  }, [connectionState, connect, toggleRecording]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setConnectionState('disconnected');
    setIsRecording(false);
    setStatus('Tap to connect');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const buttonColor = isRecording
    ? 'bg-red-500 hover:bg-red-600'
    : connectionState === 'connected'
      ? 'bg-green-600 hover:bg-green-700'
      : connectionState === 'connecting'
        ? 'bg-yellow-500'
        : 'bg-blue-600 hover:bg-blue-700';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Amber Voice</h1>
        <p className="text-slate-400">Powered by Hume EVI</p>
      </div>

      {/* Main button */}
      <button
        onClick={handleMainButtonClick}
        disabled={connectionState === 'connecting'}
        className={`w-32 h-32 rounded-full ${buttonColor} text-white flex items-center justify-center transition-all duration-200 shadow-lg ${
          connectionState === 'connecting' ? 'animate-pulse cursor-wait' : 'hover:scale-105 active:scale-95'
        } ${isRecording ? 'animate-pulse ring-4 ring-red-300' : ''}`}
      >
        {connectionState === 'connecting' ? (
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
      <p className="mt-6 text-lg text-white">{status}</p>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-red-400 text-sm">{error}</p>
      )}

      {/* Disconnect button */}
      {connectionState === 'connected' && (
        <button
          onClick={disconnect}
          className="mt-8 px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      )}

      {/* Instructions */}
      <div className="mt-12 text-center text-slate-500 text-sm max-w-xs">
        <p>
          {connectionState === 'disconnected' && 'Tap the button to connect and start a voice conversation.'}
          {connectionState === 'connecting' && 'Establishing connection...'}
          {connectionState === 'connected' && !isRecording && 'Tap the mic to speak. Tap again when done.'}
          {isRecording && 'Speak now. Tap when finished.'}
        </p>
      </div>
    </main>
  );
}
