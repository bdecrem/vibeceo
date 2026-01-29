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


// === SESSION STATE ===
// Now uses the unified session system from core/session.js
// JB202 is the reference implementation that correctly uses the node-based architecture
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
  { name: '/recent', description: 'Resume most recent project' },
  { name: '/projects', description: 'List all projects' },
  { name: '/mix', description: 'Show mix overview (instruments, tweaks, effects)' },
  { name: '/jb01', description: 'JB01 drum machine guide' },
  { name: '/jb202', description: 'JB202 bass synth guide (custom DSP)' },
  { name: '/jp9000', description: 'JP9000 modular synth guide (patch-based)' },
  { name: '/jt10', description: 'JT10 lead synth (101-style)' },
  { name: '/jt30', description: 'JT30 acid bass (303-style)' },
  { name: '/jt90', description: 'JT90 drum machine (909-style)' },
  { name: '/delay', description: 'Delay effect guide' },
  { name: '/status', description: 'Show current session state' },
  { name: '/clear', description: 'Clear session (stay in project)' },
  { name: '/changelog', description: 'Version history and release notes' },
  { name: '/export', description: 'Export project (README, MIDI, WAV)' },
  { name: '/help', description: 'Show available commands' },
  { name: '/exit', description: 'Quit Jambot' },
];

// === MIX OVERVIEW ===
// Builds a human-readable summary of the current mix state
import { JB01_PARAMS, JB202_PARAMS, fromEngine } from './params/converters.js';

export function buildMixOverview(session, project = null) {
  const lines = [];

  // Header: project name + session info
  const projectName = project?.name || '(unsaved)';
  const swingStr = session.swing > 0 ? `, ${session.swing}% swing` : '';
  lines.push(`${projectName} — ${session.bpm} BPM${swingStr}, ${session.bars || 2} bars`);
  lines.push('');

  // Active instruments
  const active = [];

  // JB01 drums
  const jb01Pattern = session.jb01Pattern || session.drumPattern || {};
  const jb01Voices = Object.entries(jb01Pattern)
    .filter(([_, pattern]) => Array.isArray(pattern) && pattern.some(s => s?.velocity > 0))
    .map(([voice]) => voice);
  if (jb01Voices.length > 0) {
    active.push(`jb01: ${jb01Voices.join(' ')} (${jb01Voices.length} voices)`);
  }

  // JB202 bass (custom DSP)
  const jb202Pattern = session.jb202Pattern || [];
  const jb202Notes = jb202Pattern.filter(s => s?.gate);
  if (jb202Notes.length > 0) {
    const noteNames = [...new Set(jb202Notes.map(s => s.note))];
    const range = noteNames.length > 1 ? `${noteNames[0]}-${noteNames[noteNames.length - 1]}` : noteNames[0];
    active.push(`jb202: ${jb202Notes.length} notes, ${range}`);
  }

  // Sampler
  const samplerPattern = session.samplerPattern || {};
  const samplerSlots = Object.entries(samplerPattern)
    .filter(([_, pattern]) => Array.isArray(pattern) && pattern.some(s => s?.velocity > 0))
    .map(([slot]) => slot);
  if (samplerSlots.length > 0) {
    active.push(`sampler: ${samplerSlots.join(' ')} (${samplerSlots.length} slots)`);
  }

  if (active.length > 0) {
    lines.push('ACTIVE:');
    active.forEach(a => lines.push(`  ${a}`));
    lines.push('');
  } else {
    lines.push('ACTIVE: (none)');
    lines.push('');
  }

  // Non-default tweaks
  const tweaks = [];

  // JB01 tweaks - check each active voice
  if (jb01Voices.length > 0 && session._nodes?.jb01) {
    const node = session._nodes.jb01;
    for (const voice of jb01Voices) {
      const voiceParams = JB01_PARAMS[voice];
      if (!voiceParams) continue;

      const nonDefault = [];
      for (const [param, def] of Object.entries(voiceParams)) {
        const path = `${voice}.${param}`;
        const engineVal = node.getParam(path);
        if (engineVal === undefined) continue;

        // Convert to producer units and compare to default
        const producerVal = fromEngine(engineVal, def);
        if (Math.abs(producerVal - def.default) > 0.5) {
          // Format nicely
          if (def.unit === 'dB' && producerVal !== 0) {
            nonDefault.push(`${param} ${producerVal > 0 ? '+' : ''}${Math.round(producerVal)}dB`);
          } else if (def.unit === 'semitones' && producerVal !== 0) {
            nonDefault.push(`${param} ${producerVal > 0 ? '+' : ''}${Math.round(producerVal)}`);
          } else if (def.unit === '0-100') {
            nonDefault.push(`${param} ${Math.round(producerVal)}`);
          }
        }
      }
      if (nonDefault.length > 0) {
        tweaks.push(`jb01.${voice}: ${nonDefault.join(', ')}`);
      }
    }
  }

  // JB202 tweaks (custom DSP bass synth)
  if (jb202Notes.length > 0 && session._nodes?.jb202 && JB202_PARAMS?.bass) {
    const node = session._nodes.jb202;
    const nonDefault = [];
    for (const [param, def] of Object.entries(JB202_PARAMS.bass)) {
      const path = `bass.${param}`;
      const engineVal = node.getParam(path);
      if (engineVal === undefined) continue;

      const producerVal = fromEngine(engineVal, def);
      if (Math.abs(producerVal - def.default) > 0.5) {
        if (def.unit === 'Hz') {
          nonDefault.push(`${param} ${Math.round(producerVal)}Hz`);
        } else if (def.unit === 'dB' && producerVal !== 0) {
          nonDefault.push(`${param} ${producerVal > 0 ? '+' : ''}${Math.round(producerVal)}dB`);
        } else if (def.unit === '0-100') {
          nonDefault.push(`${param} ${Math.round(producerVal)}%`);
        }
      }
    }
    if (nonDefault.length > 0) {
      tweaks.push(`jb202: ${nonDefault.join(', ')}`);
    }
  }

  if (tweaks.length > 0) {
    lines.push('TWEAKS:');
    tweaks.forEach(t => lines.push(`  ${t}`));
    lines.push('');
  }

  // Effects
  const effects = [];
  const effectChains = session.mixer?.effectChains || {};
  for (const [target, chain] of Object.entries(effectChains)) {
    if (Array.isArray(chain) && chain.length > 0) {
      const fxList = chain.map(fx => {
        const mode = fx.params?.mode ? ` (${fx.params.mode})` : '';
        return `${fx.type}${mode}`;
      }).join(' → ');
      effects.push(`${target}: ${fxList}`);
    }
  }

  if (effects.length > 0) {
    lines.push('EFFECTS:');
    effects.forEach(e => lines.push(`  ${e}`));
    lines.push('');
  }

  // Levels (only show non-zero)
  const levels = [];
  const instruments = ['jb01', 'jb202', 'sampler'];
  for (const inst of instruments) {
    const level = session[`${inst}Level`];
    if (level !== undefined && level !== 0) {
      levels.push(`${inst} ${level > 0 ? '+' : ''}${level}dB`);
    }
  }

  if (levels.length > 0) {
    lines.push('LEVELS:');
    lines.push(`  ${levels.join(' | ')}`);
  }

  return lines.join('\n');
}

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
  const jb01Pattern = session.jb01Pattern || session.drumPattern || {};
  const hasJB01 = Object.keys(jb01Pattern).some(k =>
    jb01Pattern[k]?.some(s => s?.velocity > 0)
  );
  const jb202Pattern = session.jb202Pattern || session.bassPattern || [];
  const hasJB202 = jb202Pattern?.some(s => s?.gate);
  const samplerPattern = session.samplerPattern || {};
  const hasSamples = Object.keys(samplerPattern).some(k =>
    samplerPattern[k]?.some(s => s?.velocity > 0)
  );

  const programmed = [];
  if (hasJB01) programmed.push('JB01 drums');
  if (hasJB202) programmed.push('JB202 bass');
  if (hasSamples) programmed.push('Sampler');

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
          if ((block.name === 'render' || block.name === 'test_tone') && context.getRenderPath) {
            toolContext.renderPath = context.getRenderPath();
          }

          let result = executeTool(block.name, block.input, session, toolContext);
          if (result instanceof Promise) {
            result = await result;
          }

          callbacks.onToolResult?.(result);

          // AUTO-SAVE after every tool that modifies state
          callbacks.onAfterTool?.(block.name, session);

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
  v0.0.3 — What's New
  ✓ JB01 drums + JB202 bass synth
  ✓ JP9000 modular synth with Karplus-Strong
  ✓ Sampler — load your own kits
  ✓ 17 genres of production knowledge
  ✓ Projects saved to ~/Documents/Jambot/
 ─────────────────────────────────────────────────
  "make me an acid track at 130"
  "add a squelchy bass line"
  "render it"
 ─────────────────────────────────────────────────

  / for commands • github.com/bdecrem/jambot
`;

// === HELP TEXT ===
export const HELP_TEXT = `
Slash Commands

  /new [name]   Start a new project
  /open <name>  Open an existing project
  /recent       Resume most recent project
  /projects     List all projects (with timestamps)
  /mix          Show mix overview
  /jb01         JB01 drum machine guide (kochi.to/jb01)
  /jb202        JB202 bass synth guide (kochi.to/jb202)
  /jp9000       JP9000 modular synth guide
  /jt10         JT10 lead synth (kochi.to/jt10)
  /jt30         JT30 acid bass (kochi.to/jt30)
  /jt90         JT90 drum machine (kochi.to/jt90)
  /delay        Delay effect guide
  /status       Show current session state
  /clear        Clear session (stay in project)
  /changelog    Version history
  /exit         Quit Jambot

Or just talk:
  > make me a techno beat at 128
  > add a bass line
  > tweak the kick decay
  > add reverb to the hats
`;

export const CHANGELOG_TEXT = `
Changelog

  v0.0.3 — Jan 27, 2026

  Instruments
  • JB01 drum machine — 8 voices (kick, snare, clap, ch, oh, lowtom, hitom, cymbal)
  • JB202 bass synth — custom DSP, cross-platform consistent
  • JP9000 modular — patchable synth with Karplus-Strong strings
  • Sampler — 10-slot sample player with custom kits

  Features
  • Genre knowledge (17 genres with production tips)
  • Song mode with patterns A, B, C...
  • Effect chains (delay, reverb)
  • Project system: ~/Documents/Jambot/
  • MIDI export (/export)
  • Natural language everything

  v0.0.1 — Jan 13, 2026
  • Initial prototype
`;

export const SAMPLER_GUIDE = `
Sampler — Sample Player

  KITS
  Load sample kits from bundled or user folders.
  Bundled: ./samples/         (ships with app)
  User:    ~/Documents/Jambot/kits/ (add your own)

  Each kit has 10 slots: s1 through s10
  Use list_kits to see available kits

  WORKFLOW
  1. list_kits     See what's available
  2. load_kit      Load a kit by ID (e.g., "808")
  3. add_samples   Program patterns for each slot
  4. tweak_samples Adjust sound per slot

  PARAMETERS  "tweak slot s1..."
  level    Volume in dB (-60 to +6)
  tune     Pitch in semitones (-24 to +24)
  attack   Fade-in 0-100
  decay    Length 0-100
  filter   Lowpass in Hz (200-20000)
  pan      Stereo position (-100 to +100)

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

// === ACTIVE INSTRUMENT GUIDES ===

export const JB01_GUIDE = `
JB01 — Drum Machine

  Web UI: kochi.to/jb01

  VOICES
  kick     Bass drum        snare    Snare drum
  clap     Handclap         ch       Closed hi-hat
  oh       Open hi-hat      perc     Percussion
  tom      Tom              cymbal   Crash/ride

  PARAMETERS  "tweak the kick..."
  level    Volume in dB (-60 to +6). 0dB = unity
  decay    Length 0-100. Low = tight punch, high = boomy
  tune     Pitch in semitones (-12 to +12). Negative = deeper
  attack   Click amount 0-100 (kick only)
  sweep    Pitch envelope 0-100 (kick only)
  tone     Brightness 0-100 (hats, snare)

  PATTERNS
  > add_jb01({ kick: [0,4,8,12], ch: [0,2,4,6,8,10,12,14] })
  > "four on the floor with 8th note hats"
  > "add snare on 4 and 12"

  PRESETS
  > "list jb01 kits"
  > "load the punchy kit"

  EXAMPLES
  > "make me a techno beat at 128"
  > "tune the kick down 2 semitones"
  > "mute the snare"
  > "add 30% swing"
`;

export const JB202_GUIDE = `
JB202 — Modular Bass Synth (Custom DSP)

  Web UI: kochi.to/jb202

  WHAT'S DIFFERENT?
  JB202 uses custom DSP components written in pure JavaScript:
  - PolyBLEP band-limited oscillators (alias-free)
  - 24dB/oct cascaded biquad lowpass filter
  - Exponential ADSR envelope generators
  - Soft-clip drive saturation

  Produces IDENTICAL output in browser and Node.js rendering.

  ARCHITECTURE
  2 oscillators -> filter -> amp -> drive
  Each step: note, gate, accent, slide

  PARAMETERS  "tweak the jb202..."
  Oscillators:
    osc1Waveform   sawtooth/square/triangle
    osc1Octave     Octave shift (-24 to +24 semitones)
    osc1Detune     Fine tune (-50 to +50 cents)
    osc1Level      Mix level 0-100
    (same for osc2)

  Filter:
    filterCutoff     Frequency in Hz (20-16000)
    filterResonance  Q amount 0-100
    filterEnvAmount  Envelope depth -100 to +100

  Envelopes:
    filterAttack/Decay/Sustain/Release  0-100
    ampAttack/Decay/Sustain/Release     0-100

  Output:
    drive    Saturation 0-100
    level    Output level 0-100

  PATTERNS
  > add_jb202({ pattern: [{note:'C2',gate:true}, ...] })
  > "add a bass line with the jb202"
  > "make it squelchy"

  PRESETS
  > "list jb202 kits"      (sound presets)
  > "list jb202 sequences" (pattern presets)

  WHY USE JB202?
  - Cross-platform consistency (browser == Node.js output)
  - Modular DSP for experimentation
  - Band-limited oscillators (no aliasing)
  - Custom filter with smooth resonance
`;

export const DELAY_GUIDE = `
DELAY — Echo Effect

  MODES
  analog     Mono with saturation, warm tape-style
  pingpong   Stereo bouncing L→R→L

  PARAMETERS
  time       Delay time in ms (1-2000), default 375
  sync       Tempo sync: off, 8th, dotted8th, triplet8th, 16th, quarter
  feedback   Repeat amount 0-100, default 50
  mix        Wet/dry balance 0-100, default 30
  lowcut     Remove mud (Hz), default 80
  highcut    Tame harshness (Hz), default 8000
  saturation Analog warmth 0-100 (analog mode only)
  spread     Stereo width 0-100 (pingpong mode only)

  TARGETS
  Instrument:  jb01, jb202, sampler
  Voice:       jb01.ch, jb01.kick, jb01.snare (per-voice)
  Master:      master

  EXAMPLES
  > add_effect({ target: 'jb01.ch', effect: 'delay', mode: 'pingpong' })
  > "add delay to the hats"
  > "put a dub delay on the snare"
  > "pingpong delay on the bass, sync to dotted 8ths"

  TWEAKING
  > tweak_effect({ target: 'jb01.ch', effect: 'delay', feedback: 70 })
  > "more feedback on the delay"
  > "sync the delay to 16th notes"

  REMOVING
  > remove_effect({ target: 'jb01.ch', effect: 'delay' })
  > "remove the delay from the hats"
`;

export const JP9000_GUIDE = `
JP9000 — Modular Synthesizer

  A text-controllable virtual modular synth.
  Build patches by adding modules and connecting them.

  WORKFLOW
  1. add_jp9000({ preset: 'basic' })  Start with preset or empty
  2. add_module({ type: 'osc-saw' })  Add modules
  3. connect_modules({ from, to })    Patch cables
  4. set_jp9000_output({ module })    Set output
  5. set_trigger_modules({ modules }) What responds to pattern
  6. add_jp9000_pattern({ pattern })  Add notes
  7. render

  PRESETS
  basic     osc -> filter -> vca (subtractive)
  pluck     Karplus-Strong string -> filter -> drive
  dualBass  dual oscs -> mixer -> filter -> vca -> drive

  MODULES
  Sound Sources:
    osc-saw       Sawtooth oscillator
    osc-square    Square oscillator (with pulse width)
    osc-triangle  Triangle oscillator
    string        Karplus-Strong physical modeling

  Filters:
    filter-lp24   24dB/oct lowpass (cutoff, resonance, envAmount)
    filter-biquad Biquad filter (frequency, Q, type)

  Modulation:
    env-adsr      ADSR envelope (attack, decay, sustain, release)

  Utilities:
    vca           Voltage-controlled amp (gain)
    mixer         4-channel mixer (gain1-4)

  Effects:
    drive         Saturation (amount, type: 1=soft, 2=tube, 3=hard)

  PORT NAMING
  moduleId.portName — e.g., osc1.audio, env1.cv, filter1.cutoffCV

  STRING MODULE (Karplus-Strong)
  The killer module. Physical modeling synthesis.
    frequency      Pitch (or use note names)
    decay          How long it rings (0-100)
    brightness     High frequency content (0-100)
    pluckPosition  Where you pluck (0-100)

  RIG MANAGEMENT
  > save_jp9000_rig({ name: 'dark-bass' })
  > load_jp9000_rig({ name: 'dark-bass' })
  > list_jp9000_rigs()
  Rigs saved to ~/Documents/Jambot/rigs/

  EXAMPLES
  > "build a jp9000 with the pluck preset"
  > "add a square oscillator"
  > "connect osc1 to the filter"
  > "tweak the string decay to 80"
  > "save this as fat-pluck"
`;

export const JT10_GUIDE = `
JT10 — Lead Synth (101-style)

  Web UI: kochi.to/jt10

  Monosynth with PolyBLEP oscillators, sub-osc, Moog ladder filter, LFO.
  Good for leads and bass.

  PATTERN (16 steps)
  add_jt10({ pattern: [
    { note: 'C3', gate: true, accent: false, slide: false },
    { note: 'C3', gate: false, accent: false, slide: false },
    ...
  ]})

  TWEAKS
  tweak_jt10({ filterCutoff: 2000, filterResonance: 40, lfoRate: 5 })

  PARAMS: level, waveform, pulseWidth, subLevel, filterCutoff,
          filterResonance, filterEnvAmount, ADSR, lfoRate, lfoAmount
`;

export const JT30_GUIDE = `
JT30 — Acid Bass (303-style)

  Web UI: kochi.to/jt30

  Classic acid synth. Saw/square oscillator, Moog filter tuned for
  303-style resonance (no self-oscillation), accent boosts resonance.

  PATTERN (16 steps)
  add_jt30({ pattern: [
    { note: 'C2', gate: true, accent: true, slide: false },
    { note: 'C2', gate: true, accent: false, slide: true },
    ...
  ]})

  TWEAKS
  tweak_jt30({ filterCutoff: 800, filterResonance: 70, filterEnvAmount: 80 })

  KEY: Keep cutoff LOW, env mod HIGH, use ACCENTS for squelch.
`;

export const JT90_GUIDE = `
JT90 — Drum Machine (909-style)

  Web UI: kochi.to/jt90

  11 voices: kick, snare, clap, rimshot, lowtom, midtom, hitom,
             ch, oh, crash, ride

  PATTERN
  add_jt90({ kick: [0, 8], snare: [4, 12], ch: [0,2,4,6,8,10,12,14] })

  TWEAKS
  tweak_jt90({ voice: 'kick', decay: 60, attack: 30 })
  tweak_jt90({ voice: 'snare', snappy: 70, tone: 50 })

  PARAMS: level, tune, decay, attack (kick), tone, snappy (snare)
`;
