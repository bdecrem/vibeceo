/**
 * Amber Voice CLM — Full Agent Mode
 * Routes through OpenClaw on M4 with full tool access.
 */
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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
        user: AGENT.sessionUser,
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

    return new Response(wantsStream ? sse(content) : nonStream(content), {
      headers: { 'Content-Type': wantsStream ? 'text/event-stream' : 'application/json', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error(`[voice-clm] ${AGENT.name} error:`, error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
