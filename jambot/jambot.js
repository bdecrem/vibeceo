// jambot/jambot.js - Agent loop and tool wiring
// Rendering, effects, and library are in core/ and effects/
// UI is in ui.js

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

// R9DS Sampler
import { ensureUserKitsDir } from './kit-loader.js';

// Project management
import { listProjects } from './project.js';

// Tool registry
import { executeTool } from './tools/index.js';

// Unified session manager (node-based architecture)
import { createSession as createCoreSession } from './core/session.js';

// Extracted modules
import { renderSession } from './core/render.js';
import { detectGenres, buildGenreContext } from './core/library.js';

// Tool definitions (65 tools for Anthropic API)
import { TOOLS } from './tools/tool-definitions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load Jambot system prompt from external file
const JAMBOT_PROMPT = readFileSync(join(__dirname, 'JAMBOT-PROMPT.md'), 'utf-8');

// === API KEY HANDLING ===
// Check multiple locations for Anthropic API key
const JAMBOT_CONFIG_DIR = join(homedir(), '.jambot');
const JAMBOT_ENV_FILE = join(JAMBOT_CONFIG_DIR, '.env');

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
  // 1. Check environment variable (already set)
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // 2. Check ~/.jambot/.env
  if (existsSync(JAMBOT_ENV_FILE)) {
    loadEnvFile(JAMBOT_ENV_FILE);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }

  // 3. Check ./.env (local directory)
  const localEnv = join(process.cwd(), '.env');
  if (existsSync(localEnv)) {
    loadEnvFile(localEnv);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }

  // 4. Check ../sms-bot/.env.local (dev environment)
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
  // Create config directory if needed
  if (!existsSync(JAMBOT_CONFIG_DIR)) {
    mkdirSync(JAMBOT_CONFIG_DIR, { recursive: true });
  }

  // Write the key to ~/.jambot/.env
  writeFileSync(JAMBOT_ENV_FILE, `ANTHROPIC_API_KEY=${key}\n`);
  process.env.ANTHROPIC_API_KEY = key;
}

export function getApiKeyPath() {
  return JAMBOT_ENV_FILE;
}

// Initialize API key (loads from various locations)
// If no key found, getApiKey() returns null and UI will prompt
getApiKey();

// Client is created lazily to allow UI to prompt for key first
let _client = null;
function getClient() {
  if (!_client) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('No API key configured');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// === 909 KITS - imported from web app (single source of truth) ===
import { TR909_KITS } from '../web/public/909/dist/machines/tr909/presets.js';

// === 101 PRESETS - imported from web app (single source of truth) ===
import SH101Presets from '../web/public/101/dist/machines/sh101/presets.js';
const SH101_PRESETS = Object.values(SH101Presets);

// === SESSION STATE ===
// Now uses the unified session system from core/session.js
// JB200 is the reference implementation that correctly uses the node-based architecture
export function createSession() {
  // Ensure user kits directory exists
  ensureUserKitsDir();

  // Create session using the unified session manager
  // This sets up the node-based architecture with proxies for parameter access
  const session = createCoreSession({ bpm: 128 });

  return session;
}

// TOOLS imported from './tools/tool-definitions.js'
export { TOOLS };

// === SLASH COMMANDS ===
export const SLASH_COMMANDS = [
  { name: '/new', description: 'Start a new project' },
  { name: '/open', description: 'Open an existing project' },
  { name: '/projects', description: 'List all projects' },
  { name: '/r9d9', description: 'R9D9 drum machine guide' },
  { name: '/r3d3', description: 'R3D3 acid bass guide' },
  { name: '/r1d1', description: 'R1D1 lead synth guide' },
  { name: '/r9ds', description: 'R9DS sampler guide' },
  { name: '/kits', description: 'List available sample kits' },
  { name: '/status', description: 'Show current session state' },
  { name: '/clear', description: 'Clear session (stay in project)' },
  { name: '/changelog', description: 'Version history and release notes' },
  { name: '/export', description: 'Export project (README, MIDI, WAV)' },
  { name: '/help', description: 'Show available commands' },
  { name: '/exit', description: 'Quit Jambot' },
];


// === SESSION STATE CONTEXT ===
// Builds a summary of current session state for the agent
function buildSessionContext(session) {
  const parts = [];

  // BPM
  if (session.bpm) {
    parts.push(`BPM: ${session.bpm}`);
  }

  // Swing
  if (session.swing > 0) {
    parts.push(`Swing: ${session.swing}%`);
  }

  // R9DS Kit - this is the critical one for kit creation workflow
  if (session.samplerKit) {
    const slotList = session.samplerKit.slots
      .map(s => `${s.id}=${s.name} (${s.short})`)
      .join(', ');
    parts.push(`LOADED KIT: "${session.samplerKit.name}" with slots: ${slotList}`);
  }

  // Summary of what's programmed
  const hasDrums = Object.keys(session.drumPattern).some(k =>
    session.drumPattern[k]?.some(s => s.velocity > 0)
  );
  const hasBass = session.bassPattern?.some(s => s.gate);
  const hasLead = session.leadPattern?.some(s => s.gate);
  const hasSamples = Object.keys(session.samplerPattern).some(k =>
    session.samplerPattern[k]?.some(s => s.velocity > 0)
  );

  const programmed = [];
  if (hasDrums) programmed.push('R9D9 drums');
  if (hasBass) programmed.push('R3D3 bass');
  if (hasLead) programmed.push('R1D1 lead');
  if (hasSamples) programmed.push('R9DS samples');

  if (programmed.length > 0) {
    parts.push(`Programmed: ${programmed.join(', ')}`);
  }

  // Song mode: saved patterns
  const savedPatterns = [];
  if (session.patterns) {
    for (const [instrument, patterns] of Object.entries(session.patterns)) {
      const names = Object.keys(patterns);
      if (names.length > 0) {
        // Show pattern names and their key params
        const patternDetails = names.map(name => {
          const p = patterns[name];
          if (instrument === 'drums' && p.params) {
            const paramSummary = Object.entries(p.params)
              .map(([voice, params]) => {
                const vals = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',');
                return `${voice}:{${vals}}`;
              }).join(' ');
            return paramSummary ? `${name}(${paramSummary})` : name;
          }
          return name;
        });
        savedPatterns.push(`${instrument}: ${patternDetails.join(', ')}`);
      }
    }
  }
  if (savedPatterns.length > 0) {
    parts.push(`Saved patterns: ${savedPatterns.join('; ')}`);
  }

  // Song mode: arrangement
  if (session.arrangement && session.arrangement.length > 0) {
    const sections = session.arrangement.map((s, i) => {
      const instruments = Object.entries(s.patterns || {}).map(([k, v]) => `${k}=${v}`).join(',');
      return `${i + 1}:${s.bars}bars[${instruments}]`;
    });
    parts.push(`Arrangement: ${sections.join(' → ')}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `\n\nCURRENT SESSION STATE:\n${parts.join('\n')}`;
}

// === AGENT LOOP ===
// callbacks: { onStart, onTool, onToolResult, onResponse, onEnd }
// context: { renderPath, onRender } - passed to executeTool
export async function runAgentLoop(task, session, messages, callbacks, context = {}) {
  callbacks.onStart?.(task);

  messages.push({ role: "user", content: task });

  // Detect genres in the conversation for context injection
  const conversationText = messages.map(m => typeof m.content === 'string' ? m.content : '').join(' ');
  const detectedGenres = detectGenres(conversationText);
  const genreContext = buildGenreContext(detectedGenres);

  while (true) {
    // Build system prompt with CURRENT session state (regenerated each iteration)
    const sessionContext = buildSessionContext(session);
    const systemPrompt = JAMBOT_PROMPT + genreContext + sessionContext;
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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

          // Build tool context with render capabilities
          let toolContext = {
            ...context,
            renderSession,  // Pass renderSession function to tools
          };
          if (block.name === 'render' && context.getRenderPath) {
            toolContext.renderPath = context.getRenderPath();
          }

          let result = executeTool(block.name, block.input, session, toolContext);
          if (result instanceof Promise) {
            result = await result;
          }

          callbacks.onToolResult?.(result);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  return { session, messages };
}

// === SPLASH SCREEN ===
export const SPLASH = `
     ██╗ █████╗ ███╗   ███╗██████╗  ██████╗ ████████╗
     ██║██╔══██╗████╗ ████║██╔══██╗██╔═══██╗╚══██╔══╝
     ██║███████║██╔████╔██║██████╔╝██║   ██║   ██║
██   ██║██╔══██║██║╚██╔╝██║██╔══██╗██║   ██║   ██║
╚█████╔╝██║  ██║██║ ╚═╝ ██║██████╔╝╚██████╔╝   ██║
 ╚════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝  ╚═════╝    ╚═╝

  🤖 Your AI just learned to funk 🎛️
 ─────────────────────────────────────────────────
  v0.0.2 — What's New
  ✓ R9D9 drums + R3D3 acid bass + R1D1 lead synth
  ✓ R9DS sampler — load your own kits
  ✓ 17 genres of production knowledge
  ✓ Projects saved to ~/Documents/Jambot/
 ─────────────────────────────────────────────────
  "make me an acid track at 130"
  "add a squelchy 303 bass line"
  "render it"
 ─────────────────────────────────────────────────

  / for commands • github.com/bdecrem/jambot
`;

// === HELP TEXT ===
export const HELP_TEXT = `
Slash Commands

  /new [name]   Start a new project
  /open <name>  Open an existing project
  /projects     List all projects
  /r9d9         R9D9 drum machine guide
  /r3d3         R3D3 acid bass guide
  /r1d1         R1D1 lead synth guide
  /r9ds         R9DS sampler guide
  /kits         List available sample kits
  /status       Show current session state
  /clear        Clear session (stay in project)
  /changelog    Version history
  /exit         Quit Jambot

Or just talk:
  > make me a techno beat at 128
  > add a 303 bass line
  > layer in a synth lead
  > load the 808 kit and make a boom bap beat
`;

export const CHANGELOG_TEXT = `
Changelog

  v0.0.2 — Jan 15, 2026

  Synths
  • R9D9 (TR-909) drums — 11 voices, full parameter control
  • R3D3 (TB-303) acid bass — filter, resonance, envelope
  • R1D1 (SH-101) lead — VCO, filter, envelope
  • R9DS sampler — sample-based drums, load your own kits
  • Multi-synth rendering to single WAV

  Features
  • Genre knowledge (17 genres with production tips)
  • Project system: ~/Documents/Jambot/
  • Ink TUI with slash commands
  • First-run API key wizard
  • MIDI export (/export)
  • Natural language everything

  v0.0.1 — Jan 13, 2026
  • Initial prototype
`;

export const R9D9_GUIDE = `
R9D9 — Drum Machine (TR-909)

  KITS (sound presets)
  default    Standard 909 (E2 engine)
  bart-deep  Subby, warm kick (E1 engine, decay 0.55)
  punchy     Snappy attack
  boomy      Long decay, deep sub
  e1-classic Simple sine-based engine

  > "load the bart deep kit"
  > "use the punchy 909 kit"

  VOICES
  kick     Bass drum        snare    Snare drum
  clap     Handclap         ch       Closed hi-hat
  oh       Open hi-hat      ltom     Low tom
  mtom     Mid tom          htom     High tom
  rimshot  Rim click        crash    Crash cymbal
  ride     Ride cymbal

  PARAMETERS  "tweak the kick..."
  decay    Length (0.1-1). Low = punch, high = boom
  tune     Pitch (-12 to +12). Negative = deeper
  tone     Brightness (0-1). Snare only
  level    Volume (0-1)

  SWING    Pushes off-beats for groove
  > "add 50% swing"
  > "make it shuffle"

  EXAMPLES
  > "four on the floor with offbeat hats"
  > "ghost notes on the snare"
  > "tune the kick down, make it longer"
`;

export const R3D3_GUIDE = `
R3D3 — Acid Bass (TB-303)

  PATTERN FORMAT
  16 steps, each with: note, gate, accent, slide
  Notes: C1-C3 range (bass territory)
  Gate: true = play, false = rest
  Accent: extra punch on that note
  Slide: portamento glide to next note

  PARAMETERS  "tweak the bass..."
  waveform   sawtooth or square
  cutoff     Filter brightness (0-1)
  resonance  Squelch/acid amount (0-1)
  envMod     Filter envelope depth (0-1)
  decay      How fast filter closes (0-1)
  accent     Accent intensity (0-1)
  level      Master volume (0-1) for mixing

  THE ACID SOUND
  High resonance + envelope mod = classic squelch
  Slides between notes = that rubbery feel

  EXAMPLES
  > "add an acid bass line in A minor"
  > "make it more squelchy"
  > "turn the bass down to 0.5"
`;

export const R1D1_GUIDE = `
R1D1 — Lead Synth (SH-101)

  PATTERN FORMAT
  16 steps, each with: note, gate, accent, slide
  Notes: C2-C5 range (lead territory)
  Gate: true = play, false = rest
  Accent: emphasized note
  Slide: glide to next note

  OSCILLATOR
  vcoSaw      Sawtooth level (0-1)
  vcoPulse    Pulse wave level (0-1)
  pulseWidth  PWM width (0-1, 0.5 = square)
  subLevel    Sub-oscillator beef (0-1)

  FILTER
  cutoff      Filter brightness (0-1)
  resonance   Filter emphasis (0-1)
  envMod      Envelope to filter (0-1)

  ENVELOPE
  attack      Note fade-in (0-1)
  decay       Initial decay (0-1)
  sustain     Held level (0-1)
  release     Note fade-out (0-1)

  MIXER
  level       Master volume (0-1) for mixing

  EXAMPLES
  > "add a synth lead melody"
  > "make it more plucky with short decay"
  > "turn the lead down to 0.3"
`;

export const R9DS_GUIDE = `
R9DS — Sampler

  KITS
  Load sample kits from bundled or user folders.
  Bundled: ./samples/         (ships with app)
  User:    ~/Documents/Jambot/kits/ (add your own)

  Each kit has 10 slots: s1 through s10
  Use /kits to see available kits

  WORKFLOW
  1. list_kits     See what's available
  2. load_kit      Load a kit by ID (e.g., "808")
  3. add_samples   Program patterns for each slot
  4. tweak_samples Adjust sound per slot

  PARAMETERS  "tweak slot s1..."
  level    Volume (0-1)
  tune     Pitch in semitones (-12 to +12)
  attack   Fade-in time (0-1)
  decay    Length as % of sample (0-1)
  filter   Lowpass cutoff (0-1, 1 = bright)
  pan      Stereo position (-1 to +1)

  ADDING YOUR OWN KITS
  Just tell me about your samples folder:
  > "turn ~/Downloads/my-samples into a kit called funky"

  I'll scan the folder, ask you to name each sound,
  and create the kit automatically.

  EXAMPLES
  > "load the 808 kit"
  > "put kicks on 1 and 9, snares on 5 and 13"
  > "tune the kick down and add more decay"
  > "make a kit from ~/Music/breaks called jungle-breaks"
`;

// Legacy alias
export const TR909_GUIDE = R9D9_GUIDE;
