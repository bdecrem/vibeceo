/**
 * Full Agent Chat Endpoint
 * 
 * Unlike the voice CLM (which strips tools for Hume compatibility),
 * this routes through OpenClaw's chat completions with full agent capabilities.
 * Same agent, same tools, same session — just a different UI.
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

function logExchange(agentName: string, userText: string, assistantText: string) {
  try {
    const now = new Date();
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    const entry = `\n### App Chat — ${agentName} (${time})\n- **Bart:** ${userText}\n- **${agentName}:** ${assistantText}\n`;

    // Log locally (Mave's memory)
    const memDir = join(WORKSPACE, 'memory');
    mkdirSync(memDir, { recursive: true });
    const memFile = join(memDir, `${date}.md`);
    if (existsSync(memFile)) appendFileSync(memFile, entry);
    else writeFileSync(memFile, `# ${date}\n${entry}`);

    // For Amber, also log to M4
    if (agentName.toLowerCase() === 'amber') {
      try {
        const escaped = entry.replace(/'/g, "'\\''");
        execSync(
          `ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no ${AMBER_SSH} "mkdir -p '${AMBER_WS}/memory' && echo '${escaped}' >> '${AMBER_WS}/memory/${date}.md'"`,
          { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch {}
    }
  } catch (e) { console.error('[agent-chat] log error:', e); }
}

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
        model: 'openclaw:main',
        messages,
        stream: false,
        // No user field — routes to the main agent session (same as Discord/WhatsApp)
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

    // Log to daily memory so all sessions can see app chats
    const lastUser = messages.filter((m: any) => m.role === 'user').pop();
    if (lastUser?.content && content) {
      const userText = typeof lastUser.content === 'string' ? lastUser.content : JSON.stringify(lastUser.content);
      logExchange(agentName.charAt(0).toUpperCase() + agentName.slice(1), userText, content);
    }

    return Response.json(data);
  } catch (error) {
    console.error('[agent-chat] error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
