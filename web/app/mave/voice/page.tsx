'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceProvider, useVoice, VoiceReadyState } from '@humeai/voice-react';

/**
 * Mave Voice — Interactive voice chat with Mave via Hume EVI
 *
 * Push-to-talk interface. Hume handles STT + TTS.
 * CLM endpoint proxies to OpenClaw for full context continuity.
 */

function VoiceInner() {
  const { connect, disconnect, readyState, messages, isMuted, mute, unmute } = useVoice();
  const [token, setToken] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(0);

  const isConnected = readyState === VoiceReadyState.OPEN;
  const isConnecting = readyState === VoiceReadyState.CONNECTING;

  // Fetch token + config on mount
  useEffect(() => {
    fetch('/api/hume-token')
      .then(res => res.json())
      .then(data => {
        if (data.accessToken) {
          setToken(data.accessToken);
        } else {
          setError('Failed to get Hume token');
        }
      })
      .catch(err => setError(`Token error: ${err.message}`));

    // Fetch or create EVI config
    fetch('/api/mave/voice/config')
      .then(res => res.json())
      .then(data => {
        if (data.configId) {
          setConfigId(data.configId);
        } else {
          setError('Failed to get EVI config');
        }
      })
      .catch(err => setError(`Config error: ${err.message}`));
  }, []);

  // Track messages from Hume
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.type === 'user_message' && last.message?.content) {
      setTranscript(prev => {
        // Avoid duplicates
        const lastEntry = prev[prev.length - 1];
        if (lastEntry?.role === 'user' && lastEntry.text === last.message.content) return prev;
        return [...prev, { role: 'user', text: last.message.content }];
      });
    } else if (last.type === 'assistant_message' && last.message?.content) {
      setTranscript(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry?.role === 'assistant' && lastEntry.text === last.message.content) return prev;
        return [...prev, { role: 'assistant', text: last.message.content }];
      });
    }
  }, [messages]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  // Pulse animation
  useEffect(() => {
    if (!isTalking) { setPulse(0); return; }
    const id = setInterval(() => setPulse(p => (p + 1) % 100), 50);
    return () => clearInterval(id);
  }, [isTalking]);

  const handleConnect = useCallback(async () => {
    if (!token || !configId) return;
    setError(null);
    try {
      await connect({
        auth: { type: 'accessToken', value: token },
        configId,
      });
      // Start muted — user presses TALK to speak
      mute();
    } catch (err: any) {
      setError(`Connection failed: ${err.message}`);
    }
  }, [token, configId, connect, mute]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setTranscript([]);
  }, [disconnect]);

  const handleTalkStart = useCallback(() => {
    if (!isConnected) return;
    setIsTalking(true);
    unmute();
  }, [isConnected, unmute]);

  const handleTalkEnd = useCallback(() => {
    setIsTalking(false);
    mute();
  }, [mute]);

  // Colors matching Mave's teal/gold aesthetic
  const C = {
    bg: '#0a0a0f',
    surface: '#14141f',
    teal: '#2D9596',
    gold: '#FFD700',
    text: '#e0e0e0',
    muted: '#666',
    user: '#2D9596',
    assistant: '#FFD700',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: C.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'ui-monospace, monospace',
      color: C.text,
      overflow: 'hidden',
      WebkitUserSelect: 'none', userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${C.surface}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🌊</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.teal }}>MAVE</span>
          <span style={{ fontSize: 11, color: C.muted }}>voice</span>
        </div>
        {isConnected && (
          <button
            onClick={handleDisconnect}
            style={{
              background: 'transparent', border: `1px solid ${C.muted}`,
              color: C.muted, padding: '6px 14px', borderRadius: 6,
              fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            disconnect
          </button>
        )}
      </div>

      {/* Transcript area */}
      <div
        ref={transcriptRef}
        style={{
          flex: 1, overflow: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        {!isConnected && !isConnecting && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 20,
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: `radial-gradient(circle, ${C.teal}, ${C.bg})`,
              boxShadow: `0 0 40px ${C.teal}44`,
            }} />
            <div style={{ fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 1.8 }}>
              tap to connect<br />
              <span style={{ fontSize: 11 }}>hold TALK to speak</span>
            </div>
            <button
              onClick={handleConnect}
              disabled={!token || !configId}
              style={{
                background: C.teal, color: C.bg, border: 'none',
                padding: '14px 40px', borderRadius: 8, fontSize: 15,
                fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer',
                opacity: (!token || !configId) ? 0.4 : 1,
                boxShadow: `0 4px 20px ${C.teal}44`,
              }}
            >
              {!token || !configId ? 'loading...' : 'connect'}
            </button>
          </div>
        )}

        {isConnecting && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: C.muted, fontSize: 14 }}>connecting...</span>
          </div>
        )}

        {transcript.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
            }}
          >
            <div style={{
              background: msg.role === 'user' ? C.teal + '22' : C.gold + '15',
              border: `1px solid ${msg.role === 'user' ? C.teal + '44' : C.gold + '33'}`,
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px',
              fontSize: 14,
              color: msg.role === 'user' ? C.user : C.assistant,
              lineHeight: 1.5,
            }}>
              {msg.text}
            </div>
            <div style={{
              fontSize: 10, color: C.muted, marginTop: 4,
              textAlign: msg.role === 'user' ? 'right' : 'left',
              paddingLeft: msg.role === 'assistant' ? 4 : 0,
              paddingRight: msg.role === 'user' ? 4 : 0,
            }}>
              {msg.role === 'user' ? 'you' : 'mave'}
            </div>
          </div>
        ))}
      </div>

      {/* Talk button area */}
      {isConnected && (
        <div style={{
          padding: '20px 20px 40px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          borderTop: `1px solid ${C.surface}`,
        }}>
          <div style={{ fontSize: 11, color: C.muted }}>
            {isTalking ? 'listening...' : 'hold to talk'}
          </div>
          <button
            onPointerDown={handleTalkStart}
            onPointerUp={handleTalkEnd}
            onPointerLeave={handleTalkEnd}
            onContextMenu={e => e.preventDefault()}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: isTalking
                ? `radial-gradient(circle, ${C.teal}, ${C.teal}88)`
                : `radial-gradient(circle, ${C.surface}, ${C.bg})`,
              border: `2px solid ${isTalking ? C.teal : C.muted + '44'}`,
              boxShadow: isTalking
                ? `0 0 ${20 + Math.sin(pulse * 0.3) * 10}px ${C.teal}66`
                : 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease',
              transform: isTalking ? 'scale(1.1)' : 'scale(1)',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'none',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isTalking ? C.teal : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill={isTalking ? C.teal + '44' : 'none'} />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div style={{
          position: 'fixed', bottom: 100, left: 20, right: 20,
          background: '#ff4444', color: 'white', padding: '10px 14px',
          borderRadius: 8, fontSize: 12, textAlign: 'center',
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              background: 'transparent', border: 'none', color: 'white',
              marginLeft: 10, cursor: 'pointer', fontWeight: 'bold',
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
}

export default function MaveVoicePage() {
  return (
    <VoiceProvider>
      <VoiceInner />
    </VoiceProvider>
  );
}
