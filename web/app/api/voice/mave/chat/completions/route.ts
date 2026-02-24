/**
 * Mave Voice CLM — Streaming Full Agent Mode (v2)
 * 
 * Routes through OpenClaw with full tool access.
 * Streams response tokens as SSE so Hume EVI can start speaking immediately
 * while the agent is still thinking/running tools.
 */
import { NextRequest } from 'next/server';
import { existsSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const WORKSPACE = join(process.env.HOME || '/Users/bart', '.openclaw/workspace');

const AGENT = {
  url: 'http://localhost:18789',
  token: process.env.OPENCLAW_GATEWAY_TOKEN || '',
  agentId: 'main',
  name: 'Mave',
};

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await request.json();
    const messages = (body.messages || []).map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content
        : Array.isArray(m.content) ? m.content.map((c: any) => typeof c === 'string' ? c : c.text || '').join(' ')
        : String(m.content || ''),
    }));
    const wantsStream = body.stream !== false;
    const lastUser = messages.filter((m: any) => m.role === 'user').pop();
    console.log(`[voice-clm] ${AGENT.name} — "${lastUser?.content?.slice(0, 80)}"`);

    const voiceHint = {
      role: 'system',
      content: 'This conversation is happening via voice. Keep responses concise and conversational (1-3 sentences unless more detail is needed). Speak naturally — no markdown, no bullet points, no headers. This will be read aloud.',
    };

    // Stream from OpenClaw so we can forward tokens immediately
    const resp = await fetch(`${AGENT.url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT.token}`,
        'x-openclaw-agent-id': AGENT.agentId,
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: [voiceHint, ...messages],
        stream: true,
      }),
    });

    if (!resp.ok) {
      console.error(`[voice-clm] error (${resp.status}):`, (await resp.text()).slice(0, 200));
      const fallback = "Sorry, I'm having trouble right now.";
      const id = `chatcmpl-${Date.now()}`;
      if (wantsStream) {
        const sseBody = `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model: 'voice-clm', choices: [{ index: 0, delta: { role: 'assistant', content: fallback }, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model: 'voice-clm', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`;
        return new Response(sseBody, { headers: { 'Content-Type': 'text/event-stream' } });
      }
      return new Response(JSON.stringify({ id, object: 'chat.completion', created: Math.floor(Date.now()/1000), model: 'voice-clm', choices: [{ message: { role: 'assistant', content: fallback }, finish_reason: 'stop' }] }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (!wantsStream) {
      // Non-streaming: collect everything and return
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '...';
      logExchange(lastUser?.content, content);
      return new Response(JSON.stringify({
        id: `chatcmpl-${Date.now()}`, object: 'chat.completion', created: Math.floor(Date.now()/1000), model: 'voice-clm',
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Streaming: pipe OpenClaw SSE → Hume EVI SSE
    // We forward each chunk as-is, collecting the full text for logging
    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No response body');

    let fullContent = '';
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              // Log the full exchange after stream completes
              logExchange(lastUser?.content, fullContent);
              console.log(`[voice-clm] ${AGENT.name} streamed (${Date.now() - t0}ms): ${fullContent.slice(0, 80)}`);
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            
            // Extract content from SSE data lines for logging
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) fullContent += delta;
                } catch {}
              }
            }

            // Forward the raw SSE chunk to Hume
            controller.enqueue(value);
          }
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        reader.cancel();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error(`[voice-clm] error:`, error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}

function logExchange(userText: string | undefined, assistantText: string) {
  if (!userText || !assistantText || assistantText === '...') return;
  try {
    const now = new Date();
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    const entry = `\n### Voice Chat — Mave (${time})\n- **Bart:** ${userText}\n- **Mave:** ${assistantText}\n`;
    const memDir = join(WORKSPACE, 'memory');
    mkdirSync(memDir, { recursive: true });
    const memFile = join(memDir, `${date}.md`);
    if (existsSync(memFile)) appendFileSync(memFile, entry);
    else writeFileSync(memFile, `# ${date}\n${entry}`);
  } catch (e) { console.error('[voice-clm] log error:', e); }
}
