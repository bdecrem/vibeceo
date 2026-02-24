/**
 * Full Agent Chat Endpoint — Unified Session
 * 
 * For Mave: Uses WebSocket RPC (chat.send) to inject messages into the SAME
 * main session as Discord/WhatsApp. Full context, no gaps.
 * 
 * For Amber: Falls back to chat completions (separate machine).
 */
import { NextRequest } from 'next/server';
import { checkAuth } from '../../auth-guard';
import { existsSync, appendFileSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { createPrivateKey, createPublicKey, sign, randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const WORKSPACE = join(process.env.HOME || '/Users/bart', '.openclaw/workspace');
const AMBER_SSH = 'bartssh@100.66.170.98';
const AMBER_WS = '/Users/bartssh/.openclaw/agents/amber/workspace';

// Device identity for WebSocket auth
const DEVICE_IDENTITY = (() => {
  try {
    const devicePath = join(process.env.HOME || '/Users/bart', '.openclaw/identity/device.json');
    return JSON.parse(readFileSync(devicePath, 'utf8'));
  } catch { return null; }
})();

function b64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pubKeyRaw(pem: string) {
  return createPublicKey(pem).export({ type: 'spki', format: 'der' }).slice(-32);
}

function logExchange(agentName: string, userText: string, assistantText: string) {
  try {
    const now = new Date();
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    const entry = `\n### App Chat — ${agentName} (${time})\n- **Bart:** ${userText}\n- **${agentName}:** ${assistantText}\n`;

    const memDir = join(WORKSPACE, 'memory');
    mkdirSync(memDir, { recursive: true });
    const memFile = join(memDir, `${date}.md`);
    if (existsSync(memFile)) appendFileSync(memFile, entry);
    else writeFileSync(memFile, `# ${date}\n${entry}`);

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

const AGENTS: Record<string, { url: string; token: string; agentId: string; sessionKey?: string }> = {
  mave: {
    url: 'http://localhost:18789',
    token: process.env.OPENCLAW_GATEWAY_TOKEN || '',
    agentId: 'main',
    sessionKey: 'agent:main:main', // THE main session — same as Discord
  },
  amber: {
    url: 'http://100.66.170.98:18789',
    token: '2484c09c132e9dbcf544c7d399a8fe8664df1fbd9e013bee',
    agentId: 'amber',
  },
};

/**
 * Send a message to the main session via WebSocket RPC.
 * Returns the assistant's response text.
 */
async function sendViaWsRpc(agent: typeof AGENTS.mave, message: string): Promise<string> {
  const WebSocket = (await import('ws')).default;
  const token = agent.token;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:18789`);
    let runId: string | null = null;
    let collectedContent = '';

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WS RPC timeout'));
    }, 110000);

    ws.on('message', (data: any) => {
      const msg = JSON.parse(data.toString());

      // Step 1: Handle challenge → send connect with device auth
      if (msg.type === 'event' && msg.event === 'connect.challenge' && DEVICE_IDENTITY) {
        const signedAtMs = Date.now();
        const scopes = ['operator.admin', 'operator.write', 'operator.read'];
        const payload = [
          'v2', DEVICE_IDENTITY.deviceId, 'cli', 'cli', 'operator',
          scopes.join(','), String(signedAtMs), token, msg.payload.nonce
        ].join('|');
        const sig = b64url(sign(null, Buffer.from(payload, 'utf8'), createPrivateKey(DEVICE_IDENTITY.privateKeyPem)));
        const pubKey = b64url(pubKeyRaw(DEVICE_IDENTITY.publicKeyPem));

        ws.send(JSON.stringify({
          type: 'req', id: 'connect', method: 'connect',
          params: {
            minProtocol: 3, maxProtocol: 3,
            client: { id: 'cli', version: '1.0.0', platform: 'darwin', mode: 'cli' },
            caps: ['tool-events'], auth: { token }, role: 'operator', scopes,
            device: { id: DEVICE_IDENTITY.deviceId, publicKey: pubKey, signature: sig, signedAt: signedAtMs, nonce: msg.payload.nonce }
          }
        }));
        return;
      }

      // Step 2: Connect response → send chat.send
      if (msg.type === 'res' && msg.id === 'connect') {
        if (!msg.ok) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`Connect failed: ${msg.error?.message}`));
          return;
        }
        ws.send(JSON.stringify({
          type: 'req', id: 'chat', method: 'chat.send',
          params: {
            sessionKey: agent.sessionKey!,
            message,
            timeoutMs: 100000,
            idempotencyKey: randomUUID(),
            deliver: false,
          }
        }));
        return;
      }

      // Step 3: chat.send response
      if (msg.type === 'res' && msg.id === 'chat') {
        if (!msg.ok) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`Chat send failed: ${msg.error?.message}`));
          return;
        }
        runId = msg.payload?.runId;
        console.log(`[ws-rpc] chat.send accepted, runId: ${runId}`);
        return;
      }

      // Step 4: Collect streaming deltas and wait for final
      if (msg.type === 'event' && msg.event === 'chat' && msg.payload?.runId === runId) {
        // Collect delta content if present
        if (msg.payload.state === 'delta' && msg.payload.message) {
          const m = msg.payload.message;
          if (typeof m.content === 'string') collectedContent += m.content;
          else if (Array.isArray(m.content)) {
            for (const c of m.content) {
              if (c.type === 'text' && c.text) collectedContent += c.text;
            }
          }
        }
        
        if (msg.payload.state === 'final') {
          // Try to get content from the final event message
          const finalMsg = msg.payload.message;
          if (finalMsg) {
            if (typeof finalMsg.content === 'string' && finalMsg.content) {
              collectedContent = finalMsg.content;
            } else if (Array.isArray(finalMsg.content)) {
              const text = finalMsg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
              if (text) collectedContent = text;
            }
          }
          
          if (collectedContent) {
            clearTimeout(timeout);
            ws.close();
            resolve(collectedContent);
            return;
          }
          
          // No content from events — fetch from history (small delay for write)
          console.log('[ws-rpc] No content in events, fetching history...');
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'req', id: 'history', method: 'chat.history',
              params: { sessionKey: agent.sessionKey!, limit: 5 }
            }));
          }, 500);
          return;
        }
        
        if (msg.payload.state === 'error') {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(msg.payload.errorMessage || 'Chat error'));
          return;
        }
      }

      // Step 5: History fallback
      if (msg.type === 'res' && msg.id === 'history') {
        clearTimeout(timeout);
        ws.close();
        if (!msg.ok) {
          resolve(collectedContent || 'Message sent but response unavailable.');
          return;
        }
        const msgs = msg.payload?.messages || msg.payload || [];
        // Find last assistant message
        for (const m of (Array.isArray(msgs) ? msgs : [])) {
          if (m.role === 'assistant') {
            let text = '';
            if (typeof m.content === 'string') text = m.content;
            else if (Array.isArray(m.content)) {
              text = m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
            }
            if (text) { resolve(text); return; }
          }
        }
        resolve(collectedContent || 'Message sent but response unavailable.');
        return;
      }
    });

    ws.on('error', (err: any) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Fallback: chat completions for agents on other machines (Amber)
 */
async function sendViaChatCompletions(agent: typeof AGENTS.mave, message: string): Promise<string> {
  const resp = await fetch(`${agent.url}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agent.token}`,
      'x-openclaw-agent-id': agent.agentId,
    },
    body: JSON.stringify({
      model: 'openclaw:main',
      messages: [{ role: 'user', content: message }],
      stream: false,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Chat completions error: ${resp.status}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const agentName = (body.agent || 'amber').toLowerCase();
    const messages = body.messages || [];
    const agent = AGENTS[agentName];

    if (!agent) {
      return Response.json({ error: `Unknown agent: ${agentName}` }, { status: 400 });
    }

    const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop();
    const userText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : JSON.stringify(lastUserMsg?.content || '');
    console.log(`[agent-chat] ${agentName} — "${userText.slice(0, 80)}"`);

    let content: string;

    // Use WebSocket RPC for agents with a sessionKey (main session unification)
    if (agent.sessionKey && DEVICE_IDENTITY) {
      try {
        content = await sendViaWsRpc(agent, userText);
      } catch (err: any) {
        console.error(`[agent-chat] WS RPC failed, falling back to chat completions:`, err.message);
        content = await sendViaChatCompletions(agent, userText);
      }
    } else {
      content = await sendViaChatCompletions(agent, userText);
    }

    console.log(`[agent-chat] ${agentName} done (${Date.now() - t0}ms): ${content.slice(0, 80)}`);

    // Log to daily memory
    if (userText && content) {
      logExchange(agentName.charAt(0).toUpperCase() + agentName.slice(1), userText, content);
    }

    return Response.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'openclaw:main',
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      }],
    });
  } catch (error: any) {
    console.error('[agent-chat] error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
