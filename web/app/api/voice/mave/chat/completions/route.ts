/**
 * Mave Voice CLM — Unified Session via WS RPC
 * 
 * Routes through the SAME main session as text chat / Discord / WhatsApp.
 * Uses chat.send so voice has full conversation context.
 */
import { NextRequest } from 'next/server';
import { existsSync, appendFileSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { createPrivateKey, createPublicKey, sign, randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const WORKSPACE = join(process.env.HOME || '/Users/bart', '.openclaw/workspace');

const AGENT = {
  url: 'ws://127.0.0.1:18789',
  token: process.env.OPENCLAW_GATEWAY_TOKEN || '',
  sessionKey: 'agent:main:main',
  name: 'Mave',
};

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

/**
 * Send a message to the main session via WebSocket RPC.
 * Returns the assistant's response text.
 */
async function sendViaWsRpc(message: string): Promise<string> {
  const WebSocket = (await import('ws')).default;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(AGENT.url);
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
          scopes.join(','), String(signedAtMs), AGENT.token, msg.payload.nonce
        ].join('|');
        const sig = b64url(sign(null, Buffer.from(payload, 'utf8'), createPrivateKey(DEVICE_IDENTITY.privateKeyPem)));
        const pubKey = b64url(pubKeyRaw(DEVICE_IDENTITY.publicKeyPem));

        ws.send(JSON.stringify({
          type: 'req', id: 'connect', method: 'connect',
          params: {
            minProtocol: 3, maxProtocol: 3,
            client: { id: 'cli', version: '1.0.0', platform: 'darwin', mode: 'cli' },
            caps: ['tool-events'], auth: { token: AGENT.token }, role: 'operator', scopes,
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
            sessionKey: AGENT.sessionKey,
            message: `[Voice message — respond concisely in 1-3 spoken sentences, no markdown] ${message}`,
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
        console.log(`[voice-clm] chat.send accepted, runId: ${runId}`);
        return;
      }

      // Step 4: Collect streaming deltas and wait for final
      if (msg.type === 'event' && msg.event === 'chat' && msg.payload?.runId === runId) {
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

          // Fallback: fetch from history
          console.log('[voice-clm] No content in events, fetching history...');
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'req', id: 'history', method: 'chat.history',
              params: { sessionKey: AGENT.sessionKey, limit: 5 }
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

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  try {
    if (!DEVICE_IDENTITY) {
      console.error('[voice-clm] No device identity found');
      return errorResponse('Device identity not configured', true);
    }

    const body = await request.json();
    const messages = (body.messages || []).map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content
        : Array.isArray(m.content) ? m.content.map((c: any) => typeof c === 'string' ? c : c.text || '').join(' ')
        : String(m.content || ''),
    }));
    const wantsStream = body.stream !== false;
    const lastUser = messages.filter((m: any) => m.role === 'user').pop();
    const userText = lastUser?.content || '';
    console.log(`[voice-clm] ${AGENT.name} — "${userText.slice(0, 80)}"`);

    // Send through the unified session
    const content = await sendViaWsRpc(userText);
    console.log(`[voice-clm] ${AGENT.name} done (${Date.now() - t0}ms): ${content.slice(0, 80)}`);

    // Log to daily memory
    logExchange(userText, content);

    const id = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    if (wantsStream) {
      // Return as SSE for Hume EVI
      const sseBody = [
        `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: 'voice-clm', choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }] })}`,
        `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: 'voice-clm', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}`,
        'data: [DONE]',
        '',
      ].join('\n\n');
      return new Response(sseBody, { headers: { 'Content-Type': 'text/event-stream' } });
    }

    return Response.json({
      id, object: 'chat.completion', created, model: 'voice-clm',
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    });
  } catch (error: any) {
    console.error(`[voice-clm] error:`, error);
    return errorResponse("Sorry, I'm having trouble right now.", body?.stream !== false);
  }
}

function errorResponse(text: string, stream: boolean) {
  const id = `chatcmpl-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  if (stream) {
    const sseBody = `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: 'voice-clm', choices: [{ index: 0, delta: { role: 'assistant', content: text }, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: 'voice-clm', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`;
    return new Response(sseBody, { headers: { 'Content-Type': 'text/event-stream' } });
  }
  return Response.json({ id, object: 'chat.completion', created, model: 'voice-clm', choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }] });
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
