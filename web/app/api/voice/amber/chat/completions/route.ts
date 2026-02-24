/**
 * Amber Voice CLM — Full Agent Mode
 * Routes through OpenClaw on M4 with full tool access.
 */
import { NextRequest } from 'next/server';
import { existsSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const WORKSPACE = join(process.env.HOME || '/Users/bart', '.openclaw/workspace');
const AMBER_SSH = 'bartssh@100.66.170.98';
const AMBER_WS = '/Users/bartssh/.openclaw/agents/amber/workspace';

const AGENT = {
  url: 'http://100.66.170.98:18789',
  token: '2484c09c132e9dbcf544c7d399a8fe8664df1fbd9e013bee',
  agentId: 'amber',
  name: 'Amber',
  sessionUser: 'amber-voice',
};

function sse(content: string): string {
  const id = `chatcmpl-${Date.now()}`;
  const chunk = JSON.stringify({
    id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: 'voice-clm',
    choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }],
  });
  const done = JSON.stringify({
    id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: 'voice-clm',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  });
  return `data: ${chunk}\n\ndata: ${done}\n\ndata: [DONE]\n\n`;
}

function nonStream(content: string): string {
  return JSON.stringify({
    id: `chatcmpl-${Date.now()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: 'voice-clm',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
  });
}

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
        stream: false,
        // No user field — routes to main session (same as Discord/WhatsApp)
      }),
    });

    if (!resp.ok) {
      console.error(`[voice-clm] ${AGENT.name} error (${resp.status}):`, (await resp.text()).slice(0, 200));
      const fallback = "Sorry, I'm having trouble right now.";
      return new Response(wantsStream ? sse(fallback) : nonStream(fallback), {
        headers: { 'Content-Type': wantsStream ? 'text/event-stream' : 'application/json' },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '...';
    console.log(`[voice-clm] ${AGENT.name} done (${Date.now() - t0}ms): ${content.slice(0, 80)}`);

    // Log to both local daily memory and Amber's M4 memory
    if (lastUser?.content && content !== '...') {
      try {
        const now = new Date();
        const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
        const entry = `\n### Voice Chat — Amber (${time})\n- **Bart:** ${lastUser.content}\n- **Amber:** ${content}\n`;
        // Local log (so Mave sees it too)
        const memDir = join(WORKSPACE, 'memory');
        mkdirSync(memDir, { recursive: true });
        const memFile = join(memDir, `${date}.md`);
        if (existsSync(memFile)) appendFileSync(memFile, entry);
        else writeFileSync(memFile, `# ${date}\n${entry}`);
        // Remote log to Amber's M4
        try {
          const escaped = entry.replace(/'/g, "'\\''");
          execSync(
            `ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no ${AMBER_SSH} "mkdir -p '${AMBER_WS}/memory' && echo '${escaped}' >> '${AMBER_WS}/memory/${date}.md'"`,
            { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
          );
        } catch {}
      } catch (e) { console.error('[voice-clm] log error:', e); }
    }

    return new Response(wantsStream ? sse(content) : nonStream(content), {
      headers: { 'Content-Type': wantsStream ? 'text/event-stream' : 'application/json', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error(`[voice-clm] ${AGENT.name} error:`, error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
