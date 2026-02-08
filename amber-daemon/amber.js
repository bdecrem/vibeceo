// amber-daemon/amber.js - Amber's agent loop
// Based on Jambot's agentic loop pattern

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

// Tool registry
import { TOOLS, executeTool } from './tools/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// === ENV LOADING ===
// Load all env vars from sms-bot/.env.local (single source of truth)
const SMS_BOT_ENV = join(__dirname, '..', 'sms-bot', '.env.local');

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        process.env[key] = rest.join('=');
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Load env on module import
if (existsSync(SMS_BOT_ENV)) {
  loadEnvFile(SMS_BOT_ENV);
}

// === IDENTITY LOADING ===
const REPO_ROOT = join(__dirname, '..');
const DRAWER_DIR = join(REPO_ROOT, 'drawer');
const MEMORY_DIR = join(homedir(), '.amber', 'memory');

// Load Amber's system prompt
const AMBER_PROMPT = readFileSync(join(__dirname, 'AMBER-PROMPT.md'), 'utf-8');

// Load identity files (PERSONA.md, MEMORY.md) from ~/.amber/memory/
// Falls back to drawer/ if memory dir doesn't exist yet
function loadIdentity() {
  const identity = { persona: null, memory: null };

  // Try new location first, fall back to drawer/
  const personaPath = existsSync(join(MEMORY_DIR, 'PERSONA.md'))
    ? join(MEMORY_DIR, 'PERSONA.md')
    : join(DRAWER_DIR, 'PERSONA.md');

  const memoryPath = existsSync(join(MEMORY_DIR, 'MEMORY.md'))
    ? join(MEMORY_DIR, 'MEMORY.md')
    : join(DRAWER_DIR, 'MEMORY.md');

  if (existsSync(personaPath)) {
    identity.persona = readFileSync(personaPath, 'utf-8');
  }
  if (existsSync(memoryPath)) {
    identity.memory = readFileSync(memoryPath, 'utf-8');
  }

  return identity;
}

// Load daily logs (last 7 days) for recent context
function loadDailyLogs() {
  if (!existsSync(MEMORY_DIR)) return '';

  let logs = '';
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const path = join(MEMORY_DIR, `${date}.md`);
    if (existsSync(path)) {
      logs += `\n\n## Daily Log: ${date}\n\n` + readFileSync(path, 'utf-8');
    }
  }
  return logs;
}

// Build full system prompt with identity
function buildSystemPrompt(session) {
  const identity = loadIdentity();
  const stateContext = buildStateContext(session);
  const dailyLogs = loadDailyLogs();

  let prompt = AMBER_PROMPT;

  // Add identity context
  if (identity.persona || identity.memory) {
    prompt += '\n\n---\n\n# Your Identity\n';

    if (identity.persona) {
      prompt += '\n## PERSONA.md\n\n' + identity.persona;
    }
    if (identity.memory) {
      prompt += '\n\n## MEMORY.md\n\n' + identity.memory;
    }
  }

  // Add recent daily logs
  if (dailyLogs) {
    prompt += '\n\n---\n\n# Recent Activity (from daily logs)\n' + dailyLogs;
  }

  prompt += stateContext;

  return prompt;
}

// === API KEY HANDLING ===
export function getApiKey() {
  return process.env.ANTHROPIC_API_KEY || null;
}

export function saveApiKey(key) {
  // No-op: amber-daemon uses sms-bot/.env.local as single source of truth
  // Add ANTHROPIC_API_KEY to sms-bot/.env.local instead
  process.env.ANTHROPIC_API_KEY = key;
  console.warn('Note: Key set for this session only. Add to sms-bot/.env.local to persist.');
}

let _client = null;
function getClient() {
  if (!_client) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('No API key configured. Set ANTHROPIC_API_KEY or run with --setup');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// === SESSION STATE ===
export function createSession() {
  return {
    createdAt: new Date().toISOString(),
    messages: [],
    // Amber's state
    mood: 'neutral',
    lastCreation: null,
    workingDir: process.cwd(),
  };
}

// === AGENT LOOP ===
export async function runAgentLoop(task, session, messages, callbacks, context = {}) {
  callbacks.onStart?.(task);

  messages.push({ role: "user", content: task });

  const MAX_TOOL_ROUNDS = 25;
  let toolRounds = 0;

  while (true) {
    // Build full system prompt with identity + state
    const systemPrompt = buildSystemPrompt(session);

    // Filter out any messages with empty content (prevents API errors)
    const cleanMessages = messages.filter(m => {
      if (!m.content) return false;
      if (typeof m.content === 'string' && m.content.trim() === '') return false;
      if (Array.isArray(m.content) && m.content.length === 0) return false;
      return true;
    });

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      tools: TOOLS,
      messages: cleanMessages
    });

    if (response.stop_reason === "end_turn") {
      messages.push({ role: "assistant", content: response.content });
      for (const block of response.content) {
        if (block.type === "text") {
          callbacks.onResponse?.(block.text);
        }
      }
      callbacks.onEnd?.();
      break;
    }

    if (response.stop_reason === "tool_use") {
      toolRounds++;
      if (toolRounds >= MAX_TOOL_ROUNDS) {
        callbacks.onResponse?.("[Hit tool limit — stopping to avoid infinite loop. Try breaking the task into smaller steps.]");
        callbacks.onEnd?.();
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          callbacks.onTool?.(block.name, block.input);

          let result;
          try {
            result = await executeTool(block.name, block.input, session, context);
          } catch (err) {
            result = `Error: ${err.message}`;
          }

          callbacks.onToolResult?.(block.name, result);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: typeof result === 'string' ? result : JSON.stringify(result)
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  return { session, messages };
}

function buildStateContext(session) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return `

---

# Current State

- **Date/Time**: ${dateStr}, ${timeStr} (Pacific)
- **Repository**: ${REPO_ROOT}
- **Working directory**: ${session.workingDir}
- **Session started**: ${session.createdAt}
- **Last creation**: ${session.lastCreation || 'none'}

## Available Tools

You have these tools available:
- \`read_file\` / \`write_file\` / \`list_directory\` — File operations
- \`run_command\` — Shell commands (git, etc.)
- \`web_search\` — Search the web
- \`discord_read\` / \`discord_post\` — Discord #agent-lounge
- \`supabase_query\` — Query amber_state table (creations, voice sessions, etc.)
- \`git_log\` — Recent git activity
- \`memory_append\` — Save notes to today's daily log (persists across sessions)
- \`memory_search\` — Semantic search across MEMORY.md and daily logs (finds concepts, not just keywords)
- \`memory_list\` — Browse all memory files (table of contents)
- \`session_list\` — List archived conversation sessions
- \`session_search\` — Semantic search across past conversation sessions
- \`send_email\` — Send email from ambercc@intheamber.com (requires Bart's approval first)
- \`mark_email_handled\` — Mark a cc_inbox email as handled after replying/skipping

## Key Paths

- Your memory: \`${MEMORY_DIR}\` (PERSONA.md, MEMORY.md, daily logs)
- Your drawer: \`${DRAWER_DIR}\`
- Creations go to: \`${join(REPO_ROOT, 'web/public/amber/')}\`
`;
}

// === EXPORTS ===
export { TOOLS };

export const SPLASH = `
    █████╗ ███╗   ███╗██████╗ ███████╗██████╗ 
   ██╔══██╗████╗ ████║██╔══██╗██╔════╝██╔══██╗
   ███████║██╔████╔██║██████╔╝█████╗  ██████╔╝
   ██╔══██║██║╚██╔╝██║██╔══██╗██╔══╝  ██╔══██╗
   ██║  ██║██║ ╚═╝ ██║██████╔╝███████╗██║  ██║
   ╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝
   
   🔮 Something forming

   /help for commands
`;
