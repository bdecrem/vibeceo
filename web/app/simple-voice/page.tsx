'use client';

import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';
import { useState, useEffect } from 'react';

const CONFIG_ID = process.env.NEXT_PUBLIC_EVI_CONFIG_ID || '';

function SimpleVoiceInner() {
  const { connect, disconnect, readyState, messages, error } = useVoice();
  const [log, setLog] = useState<string[]>(['Initialized']);
  const [token, setToken] = useState<string | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[simple-voice] ${msg}`);
    setLog(prev => [...prev.slice(-30), `${timestamp}: ${msg}`]);
  };

  // Fetch token on mount
  useEffect(() => {
    addLog('Fetching token...');
    fetch('/api/hume-token')
      .then(res => res.json())
      .then(data => {
        if (data.accessToken) {
          setToken(data.accessToken);
          addLog(`Token received: ${data.accessToken.slice(0, 15)}...`);
        } else {
          addLog('ERROR: No token in response');
        }
      })
      .catch(err => addLog(`Token fetch error: ${err.message}`));
  }, []);

  // Log state changes
  useEffect(() => {
    addLog(`Ready state: ${readyState}`);
  }, [readyState]);

  // Log errors
  useEffect(() => {
    if (error) {
      addLog(`ERROR: ${error.message || JSON.stringify(error)}`);
    }
  }, [error]);

  const handleStart = async () => {
    addLog('START CLICKED');

    if (!token) {
      addLog('No token available');
      return;
    }

    if (!CONFIG_ID) {
      addLog('No CONFIG_ID');
      return;
    }

    try {
      addLog('Calling connect()...');
      await connect({
        auth: { type: 'accessToken', value: token },
        configId: CONFIG_ID,
      });
      addLog('connect() returned');
    } catch (err: any) {
      addLog(`connect() error: ${err.message}`);
    }
  };

  const handleStop = () => {
    addLog('STOP CLICKED');
    disconnect();
  };

  const isConnected = readyState === VoiceReadyState.OPEN;
  const isConnecting = readyState === VoiceReadyState.CONNECTING;

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: 800, margin: '0 auto' }}>
      <h1>Simple EVI Test v2</h1>

      <div style={{ background: '#f0f0f0', padding: 10, marginBottom: 20, borderRadius: 4 }}>
        <div>CONFIG_ID: {CONFIG_ID ? CONFIG_ID.slice(0, 12) + '...' : 'MISSING'}</div>
        <div>Token: {token ? 'Yes (' + token.slice(0, 10) + '...)' : 'Loading...'}</div>
        <div>State: {readyState}</div>
        <div>Connected: {String(isConnected)}</div>
      </div>

      <div style={{ marginBottom: 20 }}>
        {!isConnected ? (
          <button
            onClick={handleStart}
            disabled={!token || !CONFIG_ID || isConnecting}
            style={{
              padding: '15px 30px',
              fontSize: 18,
              background: isConnecting ? '#999' : '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: !token || !CONFIG_ID || isConnecting ? 'not-allowed' : 'pointer',
            }}
          >
            {isConnecting ? 'Connecting...' : 'Start'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              padding: '15px 30px',
              fontSize: 18,
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10, marginBottom: 20, minHeight: 150, maxHeight: 300, overflow: 'auto' }}>
        <strong>Messages:</strong>
        {messages.length === 0 && <div style={{ color: '#999' }}>No messages yet</div>}
        {messages.map((m, i) => {
          if (m.type === 'user_message' || m.type === 'assistant_message') {
            return (
              <div key={i} style={{ marginTop: 8, color: m.type === 'assistant_message' ? 'purple' : 'black' }}>
                <strong>{m.message.role}:</strong> {m.message.content}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Debug Log */}
      <div style={{ background: '#1a1a1a', color: '#0f0', padding: 10, fontSize: 12, maxHeight: 300, overflow: 'auto', borderRadius: 4 }}>
        <strong style={{ color: '#fff' }}>Debug Log:</strong>
        {log.map((entry, i) => (
          <div key={i}>{entry}</div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <VoiceProvider>
      <SimpleVoiceInner />
    </VoiceProvider>
  );
}
