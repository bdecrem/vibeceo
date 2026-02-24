/**
 * Shared Voice CLM Handler
 *
 * Routes to different OpenClaw gateways based on agent ID.
 * Used by /api/voice/mave/chat/completions and /api/voice/amber/chat/completions
 */

import { NextRequest } from 'next/server';
import { readFileSync, existsSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const WORKSPACE = join(process.env.HOME || '/Users/bart', '.openclaw/workspace');

interface AgentConfig {
  url: string;
  token: string;
  name: string;
  openclawAgent: string; // agent ID on the gateway
}

const AGENTS: Record<string, AgentConfig> = {
  mave: {
    url: 'http://localhost:18789',
    token: process.env.OPENCLAW_GATEWAY_TOKEN || '',
    name: 'Mave',
    openclawAgent: 'main',
  },
  amber: {
    url: 'http://100.66.170.98:18789',
    token: '2484c09c132e9dbcf544c7d399a8fe8664df1fbd9e013bee',
    name: 'Amber',
    openclawAgent: 'amber', // not 'main' (that's Dither on M4)
  },
};

// Memory cache per agent, 60s TTL
const memoryCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 60_000;

// Read a file from a remote host via SSH (returns empty string on failure)
function sshRead(host: string, path: string, maxChars: number): string {
  try {
    const result = execSync(
      `ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no ${host} "cat '${path}' 2>/dev/null"`,
      { timeout: 5000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return result.length > maxChars ? '...' + result.slice(-maxChars) : result;
  } catch {
    return '';
  }
}

const AMBER_SSH = 'bartssh@100.66.170.98';
const AMBER_WORKSPACE = '/Users/bartssh/.openclaw/workspace';

function getMemoryContext(agentId: string): string {
  const cached = memoryCache.get(agentId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.text;

  const parts: string[] = [];
  // Use PST/PDT for date calculation (Bart is in America/Los_Angeles)
  const now = new Date();
  const pstFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = pstFormatter.format(now); // YYYY-MM-DD
  const yesterday = pstFormatter.format(new Date(now.getTime() - 86400_000));

  if (agentId === 'mave') {
    // Local files
    const memoryMd = join(WORKSPACE, 'MEMORY.md');
    if (existsSync(memoryMd)) {
      const content = readFileSync(memoryMd, 'utf-8');
      parts.push('## Long-term memory\n' + (content.length > 2000 ? '...' + content.slice(-2000) : content));
    }
    const todayFile = join(WORKSPACE, 'memory', `${today}.md`);
    if (existsSync(todayFile)) {
      const content = readFileSync(todayFile, 'utf-8');
      parts.push('## Today\n' + (content.length > 3000 ? '...' + content.slice(-3000) : content));
    }
    const yesterdayFile = join(WORKSPACE, 'memory', `${yesterday}.md`);
    if (existsSync(yesterdayFile)) {
      const content = readFileSync(yesterdayFile, 'utf-8');
      parts.push('## Yesterday\n' + (content.length > 1000 ? '...' + content.slice(-1000) : content));
    }
  } else if (agentId === 'amber') {
    // Remote files via SSH
    const soul = sshRead(AMBER_SSH, `${AMBER_WORKSPACE}/SOUL.md`, 1500);
    if (soul) parts.push('## Who you are\n' + soul);

    const memoryMd = sshRead(AMBER_SSH, `${AMBER_WORKSPACE}/MEMORY.md`, 2000);
    if (memoryMd) parts.push('## Long-term memory\n' + memoryMd);

    const todayLog = sshRead(AMBER_SSH, `${AMBER_WORKSPACE}/memory/${today}.md`, 3000);
    if (todayLog) parts.push('## Today\n' + todayLog);

    const yesterdayLog = sshRead(AMBER_SSH, `${AMBER_WORKSPACE}/memory/${yesterday}.md`, 1000);
    if (yesterdayLog) parts.push('## Yesterday\n' + yesterdayLog);
  }

  const text = parts.join('\n\n');
  memoryCache.set(agentId, { text, ts: Date.now() });
  console.log(`[voice-clm] Loaded ${agentId} memory (${text.length} chars)`);
  return text;
}

function logVoiceExchange(agentId: string, agentName: string, userText: string, assistantText: string) {
  try {
    const now = new Date();
    const pstDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
    const dateStr = pstDate.format(now);
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles'
    });
    const entry = `\n### Voice Chat — ${agentName} (${timeStr})\n- **Bart:** ${userText}\n- **${agentName}:** ${assistantText}\n`;

    // Always log to Mave's local memory (so Mave sees all voice chats)
    const memDir = join(WORKSPACE, 'memory');
    mkdirSync(memDir, { recursive: true });
    const memFile = join(memDir, `${dateStr}.md`);
    if (existsSync(memFile)) {
      appendFileSync(memFile, entry);
    } else {
      writeFileSync(memFile, `# ${dateStr}\n${entry}`);
    }

    // For Amber: also log to her memory on M4 via SSH
    if (agentId === 'amber') {
      try {
        const remoteMemDir = `${AMBER_WORKSPACE}/memory`;
        const remoteMemFile = `${remoteMemDir}/${dateStr}.md`;
        const escapedEntry = entry.replace(/'/g, "'\\''");
        execSync(
          `ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no ${AMBER_SSH} "mkdir -p '${remoteMemDir}' && echo '${escapedEntry}' >> '${remoteMemFile}'"`,
          { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
        );
        console.log(`[voice-clm] Logged to Amber's M4 memory`);
      } catch (sshErr) {
        console.error('[voice-clm] Failed to log to M4:', sshErr);
      }
    }

    memoryCache.delete(agentId);
    console.log(`[voice-clm] Logged ${agentName} voice exchange`);
  } catch (err) {
    console.error('[voice-clm] Failed to log:', err);
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
    model: 'voice-clm',
    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

function toSSEFinalChunk(id: string): string {
  return `data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'voice-clm',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  })}\n\n`;
}

export async function handleVoiceCLM(request: NextRequest, agentId: string) {
  const startTime = Date.now();
  const agent = AGENTS[agentId];

  if (!agent) {
    return new Response(JSON.stringify({ error: `Unknown agent: ${agentId}` }), { status: 400 });
  }

  console.log(`[voice-clm] ${agent.name} CLM request`);

  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const stream = body.stream !== false;

    const lastUser = messages.filter(m => m.role === 'user').pop();
    console.log(`[voice-clm] ${agent.name} — user said:`, lastUser?.content?.slice(0, 100));

    const memory = getMemoryContext(agentId);
    const voiceHint: ChatMessage = {
      role: 'system',
      content: [
        `This is a voice conversation via Hume EVI. Keep responses concise and conversational (1-3 sentences unless asked for detail).`,
        `Be natural — this is spoken aloud, not read. No markdown, no bullet points.`,
        `The user is Bart Decrem, based in Silicon Valley.`,
        memory ? `\n--- Context from memory ---\n${memory}` : '',
      ].filter(Boolean).join('\n'),
    };

    const openclawMessages = [voiceHint, ...messages];

    const openclawBody = {
      model: 'anthropic/claude-sonnet-4',
      messages: openclawMessages,
      max_tokens: 300,
      stream,
      user: `${agentId}-voice`,
    };

    if (stream) {
      const encoder = new TextEncoder();
      const id = `chatcmpl-${agentId}-${Date.now()}`;

      const readable = new ReadableStream({
        async start(controller) {
          let closed = false;
          let fullResponse = '';
          const safeEnqueue = (data: Uint8Array) => {
            if (!closed) {
              try { controller.enqueue(data); } catch { closed = true; }
            }
          };

          try {
            safeEnqueue(encoder.encode(': keep-alive\n\n'));

            const resp = await fetch(`${agent.url}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${agent.token}`,
                'x-openclaw-agent-id': agent.openclawAgent,
              },
              body: JSON.stringify(openclawBody),
            });

            if (!resp.ok) {
              const errText = await resp.text();
              console.error(`[voice-clm] ${agent.name} error:`, resp.status, errText);
              safeEnqueue(encoder.encode(toSSEChunk("Sorry, I'm having trouble connecting right now.", id)));
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

            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim().replace(/^data: /, ''));
                const content = parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  safeEnqueue(encoder.encode(toSSEChunk(content, id)));
                }
              } catch {}
            }

            safeEnqueue(encoder.encode(toSSEFinalChunk(id)));
            safeEnqueue(encoder.encode('data: [DONE]\n\n'));
            console.log(`[voice-clm] ${agent.name} response (${Date.now() - startTime}ms): ${fullResponse.slice(0, 80)}`);

            if (lastUser?.content && fullResponse) {
              logVoiceExchange(agentId, agent.name, lastUser.content, fullResponse);
            }
            if (!closed) controller.close();
          } catch (error) {
            console.error(`[voice-clm] ${agent.name} stream error:`, error);
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
      const resp = await fetch(`${agent.url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agent.token}`,
          'x-openclaw-agent-id': agent.openclawAgent,
        },
        body: JSON.stringify(openclawBody),
      });

      const data = await resp.json();
      console.log(`[voice-clm] ${agent.name} non-streaming (${Date.now() - startTime}ms)`);
      const assistantContent = data.choices?.[0]?.message?.content;
      if (lastUser?.content && assistantContent) {
        logVoiceExchange(agentId, agent.name, lastUser.content, assistantContent);
      }
      return new Response(JSON.stringify(data), {
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
