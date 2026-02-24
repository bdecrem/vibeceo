/**
 * Full Agent Chat Endpoint
 * 
 * Unlike the voice CLM (which strips tools for Hume compatibility),
 * this routes through OpenClaw's chat completions with full agent capabilities.
 * Same agent, same tools, same session — just a different UI.
 */
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // tools can take a while

const AGENTS: Record<string, { url: string; token: string; agentId: string }> = {
  mave: {
    url: 'http://localhost:18789',
    token: process.env.OPENCLAW_GATEWAY_TOKEN || '',
    agentId: 'main',
  },
  amber: {
    url: 'http://100.66.170.98:18789',
    token: '2484c09c132e9dbcf544c7d399a8fe8664df1fbd9e013bee',
    agentId: 'amber',
  },
};

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const body = await request.json();
    const agentName = (body.agent || 'amber').toLowerCase();
    const messages = body.messages || [];
    const agent = AGENTS[agentName];

    if (!agent) {
      return Response.json({ error: `Unknown agent: ${agentName}` }, { status: 400 });
    }

    console.log(`[agent-chat] ${agentName} — ${messages.length} messages`);

    // Pass through to OpenClaw chat completions — full agent mode
    const resp = await fetch(`${agent.url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.token}`,
        'x-openclaw-agent-id': agent.agentId,
      },
      body: JSON.stringify({
        model: 'openclaw:main',  // let the gateway route to its configured model
        messages,
        stream: false,
        user: `crash-app-${agentName}`, // stable session key
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[agent-chat] ${agentName} error (${resp.status}):`, errText.slice(0, 200));
      return Response.json({ error: 'Agent request failed' }, { status: 502 });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log(`[agent-chat] ${agentName} done (${Date.now() - t0}ms): ${content.slice(0, 80)}`);

    return Response.json(data);
  } catch (error) {
    console.error('[agent-chat] error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
