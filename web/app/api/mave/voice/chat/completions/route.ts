/**
 * Mave Voice CLM Endpoint
 *
 * Custom Language Model for Hume EVI.
 * Proxies to OpenClaw's chat completions API so Mave's voice
 * conversations share the same context as WhatsApp/Discord.
 *
 * We inject today's memory + MEMORY.md into the system prompt so the voice
 * session knows what happened in other channels. OpenClaw's chat completions
 * with a stable `user` string gives us session persistence (conversation
 * history across voice calls).
 */

import { NextRequest } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const WORKSPACE = join(process.env.HOME || '/Users/bart', '.openclaw/workspace');

/**
 * Read workspace memory files for context injection.
 * Reads MEMORY.md (long-term) + today's daily log + yesterday's.
 * Cached for 60s to avoid repeated disk reads within a conversation.
 */
let memoryCache: { text: string; ts: number } | null = null;
const CACHE_TTL = 60_000; // 60s

function getMemoryContext(): string {
  if (memoryCache && Date.now() - memoryCache.ts < CACHE_TTL) {
    return memoryCache.text;
  }

  const parts: string[] = [];

  // MEMORY.md — curated long-term memory
  const memoryMd = join(WORKSPACE, 'MEMORY.md');
  if (existsSync(memoryMd)) {
    const content = readFileSync(memoryMd, 'utf-8');
    // Take last 2000 chars to stay concise
    parts.push('## Long-term memory (MEMORY.md)\n' +
      (content.length > 2000 ? '...' + content.slice(-2000) : content));
  }

  // Today's daily log
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const todayFile = join(WORKSPACE, 'memory', `${today}.md`);
  if (existsSync(todayFile)) {
    const content = readFileSync(todayFile, 'utf-8');
    // Take last 3000 chars — most recent context matters most
    parts.push('## Today\'s log\n' +
      (content.length > 3000 ? '...' + content.slice(-3000) : content));
  }

  // Yesterday's daily log (for continuity)
  const yesterday = new Date(now.getTime() - 86400_000).toISOString().slice(0, 10);
  const yesterdayFile = join(WORKSPACE, 'memory', `${yesterday}.md`);
  if (existsSync(yesterdayFile)) {
    const content = readFileSync(yesterdayFile, 'utf-8');
    // Just last 1000 chars from yesterday
    parts.push('## Yesterday\'s log\n' +
      (content.length > 1000 ? '...' + content.slice(-1000) : content));
  }

  const text = parts.join('\n\n');
  memoryCache = { text, ts: Date.now() };
  console.log(`[mave-voice] Loaded memory context (${text.length} chars)`);
  return text;
}

/**
 * Log voice exchange to today's memory file.
 */
function logVoiceExchange(userText: string, assistantText: string) {
  try {
    const { appendFileSync, writeFileSync, mkdirSync } = require('fs');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles'
    });
    const memDir = join(WORKSPACE, 'memory');
    mkdirSync(memDir, { recursive: true });
    const memFile = join(memDir, `${dateStr}.md`);
    const entry = `\n### Voice Chat (${timeStr})\n- **Bart:** ${userText}\n- **Mave:** ${assistantText}\n`;

    if (existsSync(memFile)) {
      appendFileSync(memFile, entry);
    } else {
      writeFileSync(memFile, `# ${dateStr}\n${entry}`);
    }
    // Invalidate cache so next call picks up the new exchange
    memoryCache = null;
    console.log('[mave-voice] Logged voice exchange');
  } catch (err) {
    console.error('[mave-voice] Failed to log:', err);
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function toSSEChunk(text: string, id: string): string {
  return `data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'mave-openclaw',
    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

function toSSEFinalChunk(id: string): string {
  return `data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'mave-openclaw',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  })}\n\n`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[mave-voice] CLM request received');

  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const stream = body.stream !== false;

    const lastUser = messages.filter(m => m.role === 'user').pop();
    console.log('[mave-voice] User said:', lastUser?.content?.slice(0, 100));

    // Load memory context from workspace files
    const memory = getMemoryContext();

    const systemMessage: ChatMessage = {
      role: 'system',
      content: [
        'You are Mave, a voice assistant. This is a voice conversation via Hume EVI.',
        'Keep responses concise and conversational (1-3 sentences unless asked for detail).',
        'Be natural — this is spoken aloud, not read. No markdown, no bullet points.',
        'The user is Bart Decrem, based in Silicon Valley.',
        '',
        memory ? `--- Context from memory ---\n${memory}` : '',
      ].filter(Boolean).join('\n'),
    };

    const openclawMessages = [systemMessage, ...messages];

    // Use a direct model, not openclaw:main (which triggers full agent runs with tools)
    const openclawBody = {
      model: 'anthropic/claude-sonnet-4',
      messages: openclawMessages,
      max_tokens: 300,
      stream,
      user: 'mave-voice',
    };

    if (stream) {
      const encoder = new TextEncoder();
      const id = `chatcmpl-mave-${Date.now()}`;

      const readable = new ReadableStream({
        async start(controller) {
          let closed = false;
          let fullResponse = '';
          const safeEnqueue = (data: Uint8Array) => {
            if (!closed) {
              try { controller.enqueue(data); } catch { closed = true; }
            }
          };

          try {
            safeEnqueue(encoder.encode(': keep-alive\n\n'));

            const resp = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
              },
              body: JSON.stringify(openclawBody),
            });

            if (!resp.ok) {
              const errText = await resp.text();
              console.error('[mave-voice] OpenClaw error:', resp.status, errText);
              safeEnqueue(encoder.encode(toSSEChunk("Sorry, I'm having trouble connecting right now.", id)));
              safeEnqueue(encoder.encode(toSSEFinalChunk(id)));
              safeEnqueue(encoder.encode('data: [DONE]\n\n'));
              if (!closed) controller.close();
              return;
            }

            const reader = resp.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') {
                    safeEnqueue(encoder.encode(toSSEFinalChunk(id)));
                    safeEnqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullResponse += content;
                      safeEnqueue(encoder.encode(toSSEChunk(content, id)));
                    }
                    if (parsed.choices?.[0]?.finish_reason === 'stop') {
                      safeEnqueue(encoder.encode(toSSEFinalChunk(id)));
                      safeEnqueue(encoder.encode('data: [DONE]\n\n'));
                    }
                  } catch {}
                }
              }
            }

            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim().replace(/^data: /, ''));
                const content = parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  safeEnqueue(encoder.encode(toSSEChunk(content, id)));
                }
              } catch {}
            }

            safeEnqueue(encoder.encode(toSSEFinalChunk(id)));
            safeEnqueue(encoder.encode('data: [DONE]\n\n'));
            console.log(`[mave-voice] Response (${Date.now() - startTime}ms): ${fullResponse.slice(0, 80)}`);

            // Log to memory (fire and forget)
            if (lastUser?.content && fullResponse) {
              logVoiceExchange(lastUser.content, fullResponse);
            }
            if (!closed) controller.close();
          } catch (error) {
            console.error('[mave-voice] Stream error:', error);
            safeEnqueue(encoder.encode(toSSEChunk("Sorry, something went wrong.", id)));
            safeEnqueue(encoder.encode(toSSEFinalChunk(id)));
            safeEnqueue(encoder.encode('data: [DONE]\n\n'));
            if (!closed) controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      const resp = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        },
        body: JSON.stringify(openclawBody),
      });

      const data = await resp.json();
      console.log(`[mave-voice] Non-streaming response (${Date.now() - startTime}ms)`);
      const assistantContent = data.choices?.[0]?.message?.content;
      if (lastUser?.content && assistantContent) {
        logVoiceExchange(lastUser.content, assistantContent);
      }
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[mave-voice] Request error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
