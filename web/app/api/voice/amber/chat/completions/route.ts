/**
 * Amber Voice CLM
 * Calls Anthropic directly with Amber's memory injected via SSH from M4.
 * No OpenClaw gateway routing — avoids agent context conflicts.
 */
import { NextRequest } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const AMBER_SSH = 'bartssh@100.66.170.98';
const AMBER_WS = '/Users/bartssh/.openclaw/agents/amber/workspace';

let memCache: { text: string; ts: number } | null = null;

function sshCat(path: string, max: number): string {
  try {
    const r = execSync(
      `ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no ${AMBER_SSH} "cat '${path}' 2>/dev/null"`,
      { timeout: 5000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return r.length > max ? '...' + r.slice(-max) : r;
  } catch { return ''; }
}

function pstDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d);
}

function getMemory(): string {
  if (memCache && Date.now() - memCache.ts < 60_000) return memCache.text;

  const now = new Date();
  const today = pstDate(now);
  const yesterday = pstDate(new Date(now.getTime() - 86400_000));

  const parts: string[] = [];

  const soul = sshCat(`${AMBER_WS}/SOUL.md`, 2000);
  if (soul) parts.push('## Your identity\n' + soul);

  const mem = sshCat(`${AMBER_WS}/MEMORY.md`, 3000);
  if (mem) parts.push('## Long-term memory\n' + mem);

  const todayLog = sshCat(`${AMBER_WS}/memory/${today}.md`, 3000);
  if (todayLog) parts.push('## Today\'s log\n' + todayLog);

  const yestLog = sshCat(`${AMBER_WS}/memory/${yesterday}.md`, 1000);
  if (yestLog) parts.push('## Yesterday\'s log\n' + yestLog);

  const text = parts.join('\n\n');
  memCache = { text, ts: Date.now() };
  console.log(`[amber-clm] Memory: ${text.length} chars, ${parts.length} sections`);
  return text;
}

function logToAmberMemory(userText: string, assistantText: string) {
  try {
    const now = new Date();
    const date = pstDate(now);
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    const entry = `\\n### Voice Chat (${time})\\n- **Bart:** ${userText.replace(/'/g, "").replace(/\\/g, "")}\\n- **Amber:** ${assistantText.replace(/'/g, "").replace(/\\/g, "")}\\n`;
    const memDir = `${AMBER_WS}/memory`;
    const memFile = `${memDir}/${date}.md`;
    execSync(
      `ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no ${AMBER_SSH} "mkdir -p '${memDir}' && printf '${entry}' >> '${memFile}'"`,
      { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    memCache = null; // invalidate so next call sees it
    console.log('[amber-clm] Logged voice exchange to M4');
  } catch (e) {
    console.error('[amber-clm] Failed to log to M4:', e);
  }
}

// Convert OpenAI messages format to Anthropic format
function toAnthropicMessages(messages: any[]) {
  return messages
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : Array.isArray(m.content)
        ? m.content.map((c: any) => typeof c === 'string' ? { type: 'text', text: c } : c.type === 'text' ? { type: 'text', text: c.text || '' } : { type: 'text', text: JSON.stringify(c) }).filter((c: any) => c.text)
        : String(m.content || ''),
    }));
}

function getSystemPrompt(memory: string): string {
  return [
    'This is a voice conversation via Hume EVI. Keep responses concise and conversational (1-3 sentences unless asked for detail).',
    'Be natural — this is spoken aloud, not read. No markdown, no bullet points.',
    'The user is Bart Decrem, based in Silicon Valley.',
    memory ? `\n--- Context from memory ---\n${memory}` : '',
  ].filter(Boolean).join('\n');
}

function toSSE(text: string, id: string): string {
  return `data: ${JSON.stringify({
    id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000),
    model: 'voice-clm', choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

function toSSEEnd(id: string): string {
  return `data: ${JSON.stringify({
    id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000),
    model: 'voice-clm', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  })}\n\n`;
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  console.log('[amber-clm] Request received');

  try {
    const body = await request.json();
    const messages = body.messages || [];
    const stream = body.stream !== false;

    const memory = getMemory();
    const systemPrompt = getSystemPrompt(memory);
    const anthropicMessages = toAnthropicMessages(messages);

    if (stream) {
      const enc = new TextEncoder();
      const id = `chatcmpl-amber-${Date.now()}`;

      const readable = new ReadableStream({
        async start(controller) {
          let closed = false;
          let full = '';
          const send = (d: Uint8Array) => { if (!closed) { try { controller.enqueue(d); } catch { closed = true; } } };

          try {
            send(enc.encode(': keep-alive\n\n'));

            const resp = await fetch(ANTHROPIC_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 300,
                system: systemPrompt,
                messages: anthropicMessages,
                stream: true,
              }),
            });

            if (!resp.ok) {
              console.error('[amber-clm] Anthropic error:', resp.status, await resp.text());
              send(enc.encode(toSSE("Sorry, can't connect right now.", id)));
              send(enc.encode(toSSEEnd(id)));
              send(enc.encode('data: [DONE]\n\n'));
              if (!closed) controller.close();
              return;
            }

            const reader = resp.body?.getReader();
            if (!reader) throw new Error('No body');
            const dec = new TextDecoder();
            let buf = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += dec.decode(value, { stream: true });
              const lines = buf.split('\n');
              buf = lines.pop() || '';
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                  const p = JSON.parse(data);
                  // Anthropic streaming format: content_block_delta
                  if (p.type === 'content_block_delta' && p.delta?.text) {
                    full += p.delta.text;
                    send(enc.encode(toSSE(p.delta.text, id)));
                  }
                  if (p.type === 'message_stop') {
                    send(enc.encode(toSSEEnd(id)));
                    send(enc.encode('data: [DONE]\n\n'));
                  }
                } catch {}
              }
            }

            send(enc.encode(toSSEEnd(id)));
            send(enc.encode('data: [DONE]\n\n'));
            console.log(`[amber-clm] Done (${Date.now() - t0}ms): ${full.slice(0, 80)}`);
            const lastUser = messages.filter((m: any) => m.role === 'user').pop();
            if (lastUser?.content && full) {
              const userText = typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content);
              logToAmberMemory(userText, full);
            }
            if (!closed) controller.close();
          } catch (e) {
            console.error('[amber-clm] Stream error:', e);
            send(enc.encode(toSSE("Something went wrong.", id)));
            send(enc.encode(toSSEEnd(id)));
            send(enc.encode('data: [DONE]\n\n'));
            if (!closed) controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    } else {
      const resp = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: systemPrompt,
          messages: anthropicMessages,
        }),
      });

      const data = await resp.json();
      // Convert Anthropic response to OpenAI format for Hume
      const content = data.content?.[0]?.text || '';
      const openaiResp = {
        id: `chatcmpl-amber-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'voice-clm',
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
        _debug: { memoryLen: memory.length, t: Date.now() - t0 },
      };
      console.log(`[amber-clm] Non-stream (${Date.now() - t0}ms) mem=${memory.length}`);
      return new Response(JSON.stringify(openaiResp), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    console.error('[amber-clm] Error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
