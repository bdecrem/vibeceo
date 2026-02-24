/**
 * Voice CLM Handler — Full Agent Mode
 *
 * Routes through OpenClaw chat completions with full tool access.
 * Waits for complete response (tools and all), then streams back to Hume as SSE.
 * Same agent, same tools, same session — voice is just a different UI.
 */
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const AGENTS: Record<string, { url: string; token: string; agentId: string; name: string }> = {
  mave: {
    url: 'http://localhost:18789',
    token: process.env.OPENCLAW_GATEWAY_TOKEN || '',
    agentId: 'main',
    name: 'Mave',
  },
  amber: {
    url: 'http://100.66.170.98:18789',
    token: '2484c09c132e9dbcf544c7d399a8fe8664df1fbd9e013bee',
    agentId: 'amber',
    name: 'Amber',
  },
};

function toSSEChunk(text: string, id: string): string {
  return `data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'voice-clm',
    choices: [{ index: 0, delta: { role: 'assistant', content: text }, finish_reason: null }],
  })}\n\n`;
}

function toSSEDone(id: string): string {
  return `data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'voice-clm',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  })}\n\ndata: [DONE]\n\n`;
}

function toNonStreamResponse(content: string): string {
  return JSON.stringify({
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'voice-clm',
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop',
    }],
  });
}

export async function handleVoiceCLM(request: NextRequest, agentId: string) {
  const t0 = Date.now();
  const agent = AGENTS[agentId];

  if (!agent) {
    return new Response(JSON.stringify({ error: `Unknown agent: ${agentId}` }), { status: 400 });
  }

  try {
    const body = await request.json();
    const messages = body.messages || [];
    const wantsStream = body.stream !== false;

    // Normalize message content (Hume sends arrays sometimes)
    const normalizedMessages = messages.map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.map((c: any) => typeof c === 'string' ? c : c.text || '').join(' ')
          : String(m.content || ''),
    }));

    const lastUser = normalizedMessages.filter((m: any) => m.role === 'user').pop();
    console.log(`[voice-clm] ${agent.name} — "${lastUser?.content?.slice(0, 80)}"`);

    // Add a system hint that this is voice — keep responses concise and spoken
    const voiceHint = {
      role: 'system',
      content: 'This conversation is happening via voice. Keep responses concise and conversational (1-3 sentences unless more detail is needed). Speak naturally — no markdown, no bullet points, no headers. This will be read aloud.',
    };

    // Call OpenClaw with stream:false — let tools complete, get final answer
    const resp = await fetch(`${agent.url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.token}`,
        'x-openclaw-agent-id': agent.agentId,
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: [voiceHint, ...normalizedMessages],
        stream: false,
        user: `${agentId}-voice`,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[voice-clm] ${agent.name} error (${resp.status}):`, errText.slice(0, 200));
      const fallback = "Sorry, I'm having trouble right now.";
      if (wantsStream) {
        const id = `chatcmpl-${Date.now()}`;
        return new Response(toSSEChunk(fallback, id) + toSSEDone(id), {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        });
      }
      return new Response(toNonStreamResponse(fallback), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '...';
    console.log(`[voice-clm] ${agent.name} done (${Date.now() - t0}ms): ${content.slice(0, 80)}`);

    if (wantsStream) {
      // Hume expects SSE — send the complete response as one chunk
      const id = `chatcmpl-${Date.now()}`;
      return new Response(toSSEChunk(content, id) + toSSEDone(id), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      return new Response(toNonStreamResponse(content), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error(`[voice-clm] ${agent.name} error:`, error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
