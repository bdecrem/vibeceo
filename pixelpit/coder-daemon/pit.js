// pixelpit/coder-daemon/pit.js - Pit's agent loop
// The Coder. Ships working games.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { TOOLS, executeTool } from './tools/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from sms-bot/.env.local
const SMS_BOT_ENV = join(__dirname, '../..', 'sms-bot', '.env.local');

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
  } catch (e) {}
}

if (existsSync(SMS_BOT_ENV)) loadEnvFile(SMS_BOT_ENV);

// Load system prompt
const PIT_PROMPT = readFileSync(join(__dirname, 'PIT-PROMPT.md'), 'utf-8');

// Load styleguide for context
function loadStyleguide() {
  const path = join(__dirname, '..', 'creative', 'STYLEGUIDE.md');
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8');
  }
  return null;
}

function buildSystemPrompt(session) {
  let prompt = PIT_PROMPT;
  
  const styleguide = loadStyleguide();
  if (styleguide) {
    prompt += '\n\n---\n\n# Reference: STYLEGUIDE.md\n\n' + styleguide;
  }
  
  prompt += `\n\n---\n\n# Current State\n`;
  prompt += `- Working directory: ${session.workingDir}\n`;
  prompt += `- Session started: ${session.createdAt}\n`;
  prompt += `- Time: ${new Date().toISOString()}\n`;
  
  return prompt;
}

export const SPLASH = `
╔═══════════════════════════════════════════╗
║   ⚙️  PIT — The Coder                      ║
║   "Ship it."                              ║
╚═══════════════════════════════════════════╝
`;

export function getApiKey() {
  return process.env.ANTHROPIC_API_KEY || null;
}

let _client = null;
function getClient() {
  if (!_client) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('No ANTHROPIC_API_KEY');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export function createSession() {
  return {
    createdAt: new Date().toISOString(),
    messages: [],
    workingDir: '/Users/bart/Documents/code/collabs',
  };
}

export async function runAgentLoop(task, session, messages, callbacks, context = {}) {
  callbacks.onStart?.(task);
  messages.push({ role: "user", content: task });

  while (true) {
    const systemPrompt = buildSystemPrompt(session);
    
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
      const textBlock = response.content.find(b => b.type === "text");
      const text = textBlock?.text || "";
      messages.push({ role: "assistant", content: response.content });
      callbacks.onResponse?.(text);
      return text;
    }

    if (response.stop_reason === "tool_use") {
      const toolBlocks = response.content.filter(b => b.type === "tool_use");
      messages.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const tool of toolBlocks) {
        callbacks.onTool?.(tool.name);
        const result = await executeTool(tool.name, tool.input, context);
        callbacks.onToolResult?.(tool.name, result);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        });
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unknown stop reason
    const textBlock = response.content.find(b => b.type === "text");
    messages.push({ role: "assistant", content: response.content });
    callbacks.onResponse?.(textBlock?.text || "");
    return textBlock?.text || "";
  }
}
