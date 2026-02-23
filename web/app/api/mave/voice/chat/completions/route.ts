/**
 * Mave Voice CLM Endpoint
 *
 * Custom Language Model for Hume EVI.
 * Proxies to OpenClaw's chat completions API so Mave's voice
 * conversations share the same context as WhatsApp/Discord.
 *
 * Hume sends OpenAI-format requests, OpenClaw returns OpenAI-format responses.
 * We pass through with streaming support.
 */

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

/**
 * Log voice conversation to memory file so main session can see it.
 * Appends to today's memory file.
 */
async function logVoiceExchange(userText: string, assistantText: string) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    const memDir = path.join(process.env.HOME || '/Users/bart', '.openclaw/workspace/memory');
    const memFile = path.join(memDir, `${dateStr}.md`);

    // Ensure dir exists
    fs.mkdirSync(memDir, { recursive: true });

    const entry = `\n### Voice Chat (${timeStr})\n- **Bart:** ${userText}\n- **Mave:** ${assistantText}\n`;

    // Append or create
    if (fs.existsSync(memFile)) {
      fs.appendFileSync(memFile, entry);
    } else {
      fs.writeFileSync(memFile, `# ${dateStr}\n${entry}`);
    }
    console.log('[mave-voice] Logged voice exchange to', memFile);
  } catch (err) {
    console.error('[mave-voice] Failed to log voice exchange:', err);
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
    const stream = body.stream !== false; // default to streaming

    // Extract conversation - Hume sends full history
    const lastUser = messages.filter(m => m.role === 'user').pop();
    console.log('[mave-voice] User said:', lastUser?.content?.slice(0, 100));

    // Add system context so OpenClaw knows this is a voice conversation
    const systemMessage: ChatMessage = {
      role: 'system',
      content: 'This is a voice conversation via Hume EVI. Keep responses concise and conversational (1-3 sentences unless the user asks for detail). Be natural — this is spoken aloud, not read. You are Mave.',
    };

    const openclawMessages = [systemMessage, ...messages];

    if (stream) {
      // Streaming response
      const encoder = new TextEncoder();
      const id = `chatcmpl-mave-${Date.now()}`;

      const readable = new ReadableStream({
        async start(controller) {
          let closed = false;
          let fullResponse = ''; // accumulate for logging
          const safeEnqueue = (data: Uint8Array) => {
            if (!closed) {
              try { controller.enqueue(data); } catch { closed = true; }
            }
          };

          try {
            // Heartbeat
            safeEnqueue(encoder.encode(': keep-alive\n\n'));

            // Call OpenClaw with streaming
            const resp = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
              },
              body: JSON.stringify({
                model: 'anthropic/claude-sonnet-4',
                messages: openclawMessages,
                max_tokens: 300,
                stream: true,
              }),
            });

            if (!resp.ok) {
              const errText = await resp.text();
              console.error('[mave-voice] OpenClaw error:', resp.status, errText);
              // Fallback: send error as speech
              safeEnqueue(encoder.encode(toSSEChunk("Sorry, I'm having trouble connecting to my brain right now.", id)));
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

            // If OpenClaw doesn't stream, handle non-streaming response
            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim().replace(/^data: /, ''));
                const content = parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.delta?.content;
                if (content) {
                  safeEnqueue(encoder.encode(toSSEChunk(content, id)));
                }
              } catch {}
            }

            safeEnqueue(encoder.encode(toSSEFinalChunk(id)));
            safeEnqueue(encoder.encode('data: [DONE]\n\n'));

            console.log(`[mave-voice] Response complete (${Date.now() - startTime}ms)`);
            // Log voice exchange to memory (fire and forget)
            if (lastUser?.content && fullResponse) {
              logVoiceExchange(lastUser.content, fullResponse).catch(() => {});
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
      // Non-streaming response
      const resp = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4',
          messages: openclawMessages,
          max_tokens: 300,
        }),
      });

      const data = await resp.json();
      console.log(`[mave-voice] Non-streaming response (${Date.now() - startTime}ms)`);
      // Log voice exchange
      const assistantContent = data.choices?.[0]?.message?.content;
      if (lastUser?.content && assistantContent) {
        logVoiceExchange(lastUser.content, assistantContent).catch(() => {});
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
