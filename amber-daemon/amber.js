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

// Load Amber's system prompt
const AMBER_PROMPT = readFileSync(join(__dirname, 'AMBER-PROMPT.md'), 'utf-8');

// === API KEY HANDLING ===
const AMBER_CONFIG_DIR = join(homedir(), '.amber');
const AMBER_ENV_FILE = join(AMBER_CONFIG_DIR, '.env');

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

export function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Check ~/.amber/.env
  if (existsSync(AMBER_ENV_FILE)) {
    loadEnvFile(AMBER_ENV_FILE);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }

  // Check ../sms-bot/.env.local (dev environment)
  const devEnv = join(__dirname, '..', 'sms-bot', '.env.local');
  if (existsSync(devEnv)) {
    loadEnvFile(devEnv);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }

  return null;
}

export function saveApiKey(key) {
  if (!existsSync(AMBER_CONFIG_DIR)) {
    mkdirSync(AMBER_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(AMBER_ENV_FILE, `ANTHROPIC_API_KEY=${key}\n`);
  process.env.ANTHROPIC_API_KEY = key;
}

// Initialize API key
getApiKey();

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

  while (true) {
    // Build system prompt with current state
    const stateContext = buildStateContext(session);
    const systemPrompt = AMBER_PROMPT + stateContext;

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,
      messages
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
  return `

## Current State
- Working directory: ${session.workingDir}
- Session started: ${session.createdAt}
- Last creation: ${session.lastCreation || 'none'}
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
