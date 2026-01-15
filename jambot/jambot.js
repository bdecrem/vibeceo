// jambot/jambot.js - Core logic (tools, agent, WAV encoder)
// UI is in ui.js

import Anthropic from '@anthropic-ai/sdk';
import { OfflineAudioContext } from 'node-web-audio-api';

// R9D9 - Drum machine (TR-909)
import * as TR909Module from '../web/public/909/dist/machines/tr909/engine-v3.js';
const R9D9Engine = TR909Module.TR909Engine || TR909Module.default;

// R3D3 - Acid bass (TB-303)
import * as TB303Module from '../web/public/303/dist/machines/tb303/engine.js';
const R3D3Engine = TB303Module.TB303Engine || TB303Module.default;

// R1D1 - Lead synth (SH-101)
import * as SH101Module from '../web/public/101/dist/machines/sh101/engine.js';
const R1D1Engine = SH101Module.SH101Engine || SH101Module.default;

import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

// R9DS Sampler
import { getAvailableKits, loadKit, ensureUserKitsDir, getKitPaths } from './kit-loader.js';
import { SampleVoice } from './sample-voice.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// === GENRE KNOWLEDGE ===
let GENRES = {};
try {
  const genresPath = join(__dirname, 'genres.json');
  GENRES = JSON.parse(readFileSync(genresPath, 'utf-8'));
} catch (e) {
  console.warn('Could not load genres.json:', e.message);
}

// Map keywords/aliases to genre keys
const GENRE_ALIASES = {
  // Classic / Old School House
  'classic house': 'classic_house',
  'old school house': 'classic_house',
  'oldschool house': 'classic_house',
  'old school': 'classic_house',
  // Detroit Techno
  'detroit techno': 'detroit_techno',
  'detroit': 'detroit_techno',
  // Berlin Techno
  'berlin techno': 'berlin_techno',
  'berlin': 'berlin_techno',
  'berghain': 'berlin_techno',
  // Industrial Techno
  'industrial techno': 'industrial_techno',
  'industrial': 'industrial_techno',
  // Chicago House
  'chicago house': 'chicago_house',
  'chicago': 'chicago_house',
  // Deep House
  'deep house': 'deep_house',
  'deep': 'deep_house',
  // Tech House
  'tech house': 'tech_house',
  'tech-house': 'tech_house',
  // Acid House
  'acid house': 'acid_house',
  // Acid Techno
  'acid techno': 'acid_techno',
  // Generic acid -> acid house (more common)
  'acid': 'acid_house',
  // Electro
  'electro': 'electro',
  'electro funk': 'electro',
  // Drum and Bass
  'drum and bass': 'drum_and_bass',
  'drum & bass': 'drum_and_bass',
  'dnb': 'drum_and_bass',
  'd&b': 'drum_and_bass',
  'drumnbass': 'drum_and_bass',
  // Jungle
  'jungle': 'jungle',
  // Trance
  'trance': 'trance',
  // Minimal
  'minimal techno': 'minimal_techno',
  'minimal': 'minimal_techno',
  // Breakbeat
  'breakbeat': 'breakbeat',
  'breaks': 'breakbeat',
  'big beat': 'breakbeat',
  // Ambient
  'ambient': 'ambient',
  // IDM
  'idm': 'idm',
  'intelligent dance': 'idm',
  // Generic terms -> sensible defaults
  'techno': 'berlin_techno',
  'house': 'classic_house',
};

// Detect genres mentioned in text, return array of genre keys
function detectGenres(text) {
  const lower = text.toLowerCase();
  const found = new Set();

  // Sort aliases by length (longest first) to match "detroit techno" before "detroit"
  const sortedAliases = Object.keys(GENRE_ALIASES).sort((a, b) => b.length - a.length);

  for (const alias of sortedAliases) {
    if (lower.includes(alias)) {
      found.add(GENRE_ALIASES[alias]);
    }
  }

  return Array.from(found);
}

// Build genre context string for system prompt
function buildGenreContext(genreKeys) {
  if (!genreKeys.length) return '';

  const sections = genreKeys.map(key => {
    const g = GENRES[key];
    if (!g) return '';
    return `
=== ${g.name.toUpperCase()} ===
BPM: ${g.bpm[0]}-${g.bpm[1]} | Keys: ${g.keys.join(', ')} | Swing: ${g.swing}%

${g.description}

${g.production}

Reference settings:
- Drums: ${JSON.stringify(g.drums)}
- Bass: ${JSON.stringify(g.bass)}
- Classic tracks: ${g.references.join(', ')}
`;
  }).filter(Boolean);

  if (!sections.length) return '';

  return `\n\nGENRE KNOWLEDGE (use this to guide your choices):\n${sections.join('\n')}`;
}

// Make Web Audio available globally
globalThis.OfflineAudioContext = OfflineAudioContext;

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
export function createSession() {
  // Ensure user kits directory exists
  ensureUserKitsDir();

  return {
    bpm: 128,
    bars: 2,
    swing: 0,
    // R9D9 (drums)
    drumPattern: {},
    drumParams: {},
    // R3D3 (bass)
    bassPattern: createEmptyBassPattern(),
    bassParams: {
      waveform: 'sawtooth',
      cutoff: 0.5,
      resonance: 0.5,
      envMod: 0.5,
      decay: 0.5,
      accent: 0.8,
    },
    // R1D1 (lead)
    leadPattern: createEmptyLeadPattern(),
    leadParams: {
      vcoSaw: 0.5,
      vcoPulse: 0.5,
      pulseWidth: 0.5,
      subLevel: 0.3,
      cutoff: 0.5,
      resonance: 0.3,
      envMod: 0.5,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.7,
      release: 0.3,
    },
    // R9DS (sampler)
    samplerKit: null,        // Currently loaded kit { id, name, slots }
    samplerPattern: {},      // { s1: [{step, vel}, ...], s2: [...], ... }
    samplerParams: {},       // { s1: { level, tune, attack, decay, filter, pan }, ... }
  };
}

// Empty pattern helpers
function createEmptyBassPattern() {
  return Array(16).fill(null).map(() => ({
    note: 'C2',
    gate: false,
    accent: false,
    slide: false,
  }));
}

function createEmptyLeadPattern() {
  return Array(16).fill(null).map(() => ({
    note: 'C3',
    gate: false,
    accent: false,
    slide: false,
  }));
}

// === TOOLS ===
export const TOOLS = [
  {
    name: "create_session",
    description: "Create a new music session with a specific BPM",
    input_schema: {
      type: "object",
      properties: {
        bpm: { type: "number", description: "Beats per minute (60-200)" }
      },
      required: ["bpm"]
    }
  },
  {
    name: "add_drums",
    description: "Add a drum pattern. For simple patterns, use step arrays like [0,4,8,12]. For detailed velocity control, use objects like [{step:0,vel:1},{step:4,vel:0.5}]. Available voices: kick, snare, clap, ch (closed hat), oh (open hat), ltom, mtom, htom, rimshot, crash, ride.",
    input_schema: {
      type: "object",
      properties: {
        kick: { type: "array", description: "Steps for kick. Simple: [0,4,8,12] or detailed: [{step:0,vel:1},{step:8,vel:0.7}]" },
        snare: { type: "array", description: "Steps for snare" },
        clap: { type: "array", description: "Steps for clap" },
        ch: { type: "array", description: "Steps for closed hi-hat" },
        oh: { type: "array", description: "Steps for open hi-hat" },
        ltom: { type: "array", description: "Steps for low tom" },
        mtom: { type: "array", description: "Steps for mid tom" },
        htom: { type: "array", description: "Steps for high tom" },
        rimshot: { type: "array", description: "Steps for rimshot" },
        crash: { type: "array", description: "Steps for crash cymbal" },
        ride: { type: "array", description: "Steps for ride cymbal" }
      },
      required: []
    }
  },
  {
    name: "set_swing",
    description: "Set the swing amount to push off-beat notes (steps 1,3,5,7,9,11,13,15) later for groove",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Swing amount 0-100. 0=straight, 50=medium groove, 70+=heavy shuffle" }
      },
      required: ["amount"]
    }
  },
  {
    name: "tweak_drums",
    description: "Adjust drum voice parameters like decay, tune, tone, and level. Use this to shape the sound.",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to tweak"
        },
        decay: { type: "number", description: "Decay/length (0.1-1.0). Lower = shorter, punchier. Higher = longer, boomy." },
        tune: { type: "number", description: "Pitch tuning (-12 to +12 semitones). Lower = deeper." },
        tone: { type: "number", description: "Brightness (0-1). Lower = darker. (snare only)" },
        level: { type: "number", description: "Volume (0-1)" }
      },
      required: ["voice"]
    }
  },
  {
    name: "render",
    description: "Render the current session to a WAV file",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Output filename (without .wav extension)" },
        bars: { type: "number", description: "Number of bars to render (default: 2)" }
      },
      required: ["filename"]
    }
  },
  // R3D3 (TB-303 acid bass)
  {
    name: "add_bass",
    description: "Add a bass line pattern using R3D3 (TB-303 acid synth). Provide an array of 16 steps. Each step has: note (C2, D#2, etc), gate (true/false), accent (true/false), slide (true/false for glide to next note).",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C2', gate: true, accent: false, slide: false}. Use gate:false for rests.",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C2, D#2, E2, etc). Bass range: C1-C3" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra punch" },
              slide: { type: "boolean", description: "Glide/portamento to next note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_bass",
    description: "Adjust R3D3 bass synth parameters. All values 0-1 except waveform.",
    input_schema: {
      type: "object",
      properties: {
        waveform: { type: "string", enum: ["sawtooth", "square"], description: "Oscillator waveform" },
        cutoff: { type: "number", description: "Filter cutoff (0-1). Lower = darker, muffled. Higher = brighter." },
        resonance: { type: "number", description: "Filter resonance (0-1). Higher = more squelch/acid sound." },
        envMod: { type: "number", description: "Envelope modulation depth (0-1). How much filter opens on each note." },
        decay: { type: "number", description: "Envelope decay (0-1). How quickly filter closes after opening." },
        accent: { type: "number", description: "Accent intensity (0-1). How much accented notes pop." }
      },
      required: []
    }
  },
  // R1D1 (SH-101 lead synth)
  {
    name: "add_lead",
    description: "Add a lead/synth pattern using R1D1 (SH-101 synth). Provide an array of 16 steps. Each step has: note, gate, accent, slide.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C3', gate: true, accent: false, slide: false}. Lead range: C2-C5",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C3, D#3, E4, etc)" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra emphasis" },
              slide: { type: "boolean", description: "Glide/portamento to next note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_lead",
    description: "Adjust R1D1 lead synth parameters. All values 0-1.",
    input_schema: {
      type: "object",
      properties: {
        vcoSaw: { type: "number", description: "Sawtooth level (0-1)" },
        vcoPulse: { type: "number", description: "Pulse/square level (0-1)" },
        pulseWidth: { type: "number", description: "Pulse width (0-1). 0.5 = square wave" },
        subLevel: { type: "number", description: "Sub-oscillator level (0-1). Adds low-end beef." },
        cutoff: { type: "number", description: "Filter cutoff (0-1)" },
        resonance: { type: "number", description: "Filter resonance (0-1)" },
        envMod: { type: "number", description: "Filter envelope depth (0-1)" },
        attack: { type: "number", description: "Envelope attack (0-1). 0=instant, 1=slow fade in" },
        decay: { type: "number", description: "Envelope decay (0-1)" },
        sustain: { type: "number", description: "Envelope sustain level (0-1)" },
        release: { type: "number", description: "Envelope release (0-1). How long note tails after release" }
      },
      required: []
    }
  },
  {
    name: "rename_project",
    description: "Rename the current project. Use when user says 'rename to X' or 'call this X'.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "New name for the project" }
      },
      required: ["name"]
    }
  },
  // R9DS Sampler tools
  {
    name: "list_kits",
    description: "List all available sample kits (bundled + user kits from ~/Documents/Jambot/kits/)",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_kit",
    description: "Load a sample kit for R9DS. Use list_kits first to see available kits.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID to load (e.g., '808', 'amber')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "add_samples",
    description: "Add sample patterns to R9DS. Must load_kit first. Slots are s1-s10. For simple patterns use step arrays [0,4,8,12]. For velocity control use [{step:0,vel:1},{step:4,vel:0.5}].",
    input_schema: {
      type: "object",
      properties: {
        s1: { type: "array", description: "Steps for slot 1 (usually kick)" },
        s2: { type: "array", description: "Steps for slot 2 (usually snare)" },
        s3: { type: "array", description: "Steps for slot 3 (usually clap)" },
        s4: { type: "array", description: "Steps for slot 4 (usually closed hat)" },
        s5: { type: "array", description: "Steps for slot 5 (usually open hat)" },
        s6: { type: "array", description: "Steps for slot 6" },
        s7: { type: "array", description: "Steps for slot 7" },
        s8: { type: "array", description: "Steps for slot 8" },
        s9: { type: "array", description: "Steps for slot 9" },
        s10: { type: "array", description: "Steps for slot 10" }
      },
      required: []
    }
  },
  {
    name: "tweak_samples",
    description: "Tweak R9DS sample parameters. Specify slot (s1-s10) and parameters.",
    input_schema: {
      type: "object",
      properties: {
        slot: { type: "string", description: "Which slot to tweak (s1-s10)" },
        level: { type: "number", description: "Volume (0-1)" },
        tune: { type: "number", description: "Pitch in semitones (-12 to +12)" },
        attack: { type: "number", description: "Fade in time (0-1, 0=instant)" },
        decay: { type: "number", description: "Sample length percentage (0-1, 1=full sample)" },
        filter: { type: "number", description: "Lowpass filter (0-1, 0=dark, 1=bright)" },
        pan: { type: "number", description: "Stereo position (-1=left, 0=center, 1=right)" }
      },
      required: ["slot"]
    }
  },
  {
    name: "create_kit",
    description: "Create a new sample kit from audio files in a folder. Scans the folder for WAV/AIFF/MP3 files and creates a kit in ~/Documents/Jambot/kits/. Returns the list of found files so you can ask the user what to name each slot.",
    input_schema: {
      type: "object",
      properties: {
        source_folder: { type: "string", description: "Path to folder containing audio files" },
        kit_id: { type: "string", description: "ID for the new kit (lowercase, no spaces, e.g., 'my-drums')" },
        kit_name: { type: "string", description: "Display name for the kit (e.g., 'My Drums')" },
        slots: {
          type: "array",
          description: "Array of slot assignments. Each item: {file: 'original-filename.wav', name: 'Kick', short: 'KK'}. If not provided, tool returns found files for you to ask user.",
          items: {
            type: "object",
            properties: {
              file: { type: "string", description: "Original filename from source folder" },
              name: { type: "string", description: "Descriptive name for this sound" },
              short: { type: "string", description: "2-3 letter abbreviation" }
            }
          }
        }
      },
      required: ["source_folder", "kit_id", "kit_name"]
    }
  }
];

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

// === TOOL EXECUTION ===
// context is optional: { renderPath, onRender }
export function executeTool(name, input, session, context = {}) {
  if (name === "create_session") {
    session.bpm = input.bpm;
    session.swing = 0;
    // Reset R9D9 (drums)
    session.drumPattern = {};
    session.drumParams = {};
    // Reset R3D3 (bass)
    session.bassPattern = createEmptyBassPattern();
    session.bassParams = { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.5, envMod: 0.5, decay: 0.5, accent: 0.8 };
    // Reset R1D1 (lead)
    session.leadPattern = createEmptyLeadPattern();
    session.leadParams = { vcoSaw: 0.5, vcoPulse: 0.5, pulseWidth: 0.5, subLevel: 0.3, cutoff: 0.5, resonance: 0.3, envMod: 0.5, attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3 };
    // Reset R9DS (sampler) - keep kit loaded, just clear pattern
    session.samplerPattern = {};
    session.samplerParams = {};
    return `Session created at ${input.bpm} BPM`;
  }

  if (name === "set_swing") {
    session.swing = Math.max(0, Math.min(100, input.amount));
    return `Swing set to ${session.swing}%`;
  }

  // R9D9 - Add drums
  if (name === "add_drums") {
    const voices = ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'];
    const added = [];

    for (const voice of voices) {
      const steps = input[voice] || [];
      if (steps.length > 0) {
        session.drumPattern[voice] = Array(16).fill(null).map(() => ({ velocity: 0 }));
        const isDetailed = typeof steps[0] === 'object';

        if (isDetailed) {
          for (const hit of steps) {
            const step = hit.step;
            const vel = hit.vel !== undefined ? hit.vel : 1;
            if (step >= 0 && step < 16) {
              session.drumPattern[voice][step].velocity = vel;
            }
          }
          added.push(`${voice}:[${steps.map(h => h.step).join(',')}]`);
        } else {
          const defaultVel = (voice === 'ch' || voice === 'oh') ? 0.7 : 1;
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.drumPattern[voice][step].velocity = defaultVel;
            }
          }
          added.push(`${voice}:[${steps.join(',')}]`);
        }
      }
    }

    return `R9D9 drums: ${added.join(', ')}`;
  }

  // R9D9 - Tweak drums
  if (name === "tweak_drums") {
    const voice = input.voice;
    if (!session.drumParams[voice]) {
      session.drumParams[voice] = {};
    }

    const tweaks = [];
    if (input.decay !== undefined) {
      session.drumParams[voice].decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }
    if (input.tune !== undefined) {
      session.drumParams[voice].tune = input.tune;
      tweaks.push(`tune=${input.tune}`);
    }
    if (input.tone !== undefined) {
      session.drumParams[voice].tone = input.tone;
      tweaks.push(`tone=${input.tone}`);
    }
    if (input.level !== undefined) {
      session.drumParams[voice].level = input.level;
      tweaks.push(`level=${input.level}`);
    }

    return `R9D9 ${voice}: ${tweaks.join(', ')}`;
  }

  // R3D3 - Add bass
  if (name === "add_bass") {
    const pattern = input.pattern || [];
    session.bassPattern = Array(16).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      return {
        note: step.note || 'C2',
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false,
      };
    });
    const activeSteps = session.bassPattern.filter(s => s.gate).length;
    return `R3D3 bass: ${activeSteps} notes`;
  }

  // R3D3 - Tweak bass
  if (name === "tweak_bass") {
    const tweaks = [];
    if (input.waveform !== undefined) {
      session.bassParams.waveform = input.waveform;
      tweaks.push(`waveform=${input.waveform}`);
    }
    if (input.cutoff !== undefined) {
      session.bassParams.cutoff = input.cutoff;
      tweaks.push(`cutoff=${input.cutoff}`);
    }
    if (input.resonance !== undefined) {
      session.bassParams.resonance = input.resonance;
      tweaks.push(`resonance=${input.resonance}`);
    }
    if (input.envMod !== undefined) {
      session.bassParams.envMod = input.envMod;
      tweaks.push(`envMod=${input.envMod}`);
    }
    if (input.decay !== undefined) {
      session.bassParams.decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }
    if (input.accent !== undefined) {
      session.bassParams.accent = input.accent;
      tweaks.push(`accent=${input.accent}`);
    }
    return `R3D3 bass: ${tweaks.join(', ')}`;
  }

  // R1D1 - Add lead
  if (name === "add_lead") {
    const pattern = input.pattern || [];
    session.leadPattern = Array(16).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      return {
        note: step.note || 'C3',
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false,
      };
    });
    const activeSteps = session.leadPattern.filter(s => s.gate).length;
    return `R1D1 lead: ${activeSteps} notes`;
  }

  // R1D1 - Tweak lead
  if (name === "tweak_lead") {
    const tweaks = [];
    const params = ['vcoSaw', 'vcoPulse', 'pulseWidth', 'subLevel', 'cutoff', 'resonance', 'envMod', 'attack', 'decay', 'sustain', 'release'];
    for (const param of params) {
      if (input[param] !== undefined) {
        session.leadParams[param] = input[param];
        tweaks.push(`${param}=${input[param]}`);
      }
    }
    return `R1D1 lead: ${tweaks.join(', ')}`;
  }

  if (name === "render") {
    const bars = input.bars || 2;
    // Use provided renderPath from context, or fall back to filename in cwd
    const filename = context.renderPath || `${input.filename}.wav`;
    return renderSession(session, bars, filename).then(result => {
      // Notify caller about the render (for project tracking)
      context.onRender?.({ bars, bpm: session.bpm, filename });
      return result;
    });
  }

  if (name === "rename_project") {
    if (!context.onRename) {
      return "No project to rename. Create a beat first.";
    }
    const result = context.onRename(input.name);
    if (result.error) {
      return result.error;
    }
    return `Renamed project to "${result.newName}"`;
  }

  // R9DS Sampler - List kits
  if (name === "list_kits") {
    const kits = getAvailableKits();
    const paths = getKitPaths();
    if (kits.length === 0) {
      return `No kits found.\nBundled: ${paths.bundled}\nUser: ${paths.user}`;
    }
    const kitList = kits.map(k => `  ${k.id} - ${k.name} (${k.source})`).join('\n');
    return `Available kits:\n${kitList}\n\nUser kits folder: ${paths.user}`;
  }

  // R9DS Sampler - Load kit
  if (name === "load_kit") {
    try {
      const kit = loadKit(input.kit);
      session.samplerKit = kit;
      // Initialize params for each slot
      for (const slot of kit.slots) {
        if (!session.samplerParams[slot.id]) {
          session.samplerParams[slot.id] = {
            level: 0.8,
            tune: 0,
            attack: 0,
            decay: 1,
            filter: 1,
            pan: 0
          };
        }
      }
      const slotNames = kit.slots.map(s => `${s.id}:${s.short}`).join(', ');
      return `Loaded kit "${kit.name}"\nSlots: ${slotNames}`;
    } catch (e) {
      return `Error loading kit: ${e.message}`;
    }
  }

  // R9DS Sampler - Add samples pattern
  if (name === "add_samples") {
    if (!session.samplerKit) {
      return "No kit loaded. Use load_kit first.";
    }

    const slots = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];
    const added = [];

    for (const slot of slots) {
      const steps = input[slot] || [];
      if (steps.length > 0) {
        session.samplerPattern[slot] = Array(16).fill(null).map(() => ({ velocity: 0 }));
        const isDetailed = typeof steps[0] === 'object';

        if (isDetailed) {
          for (const hit of steps) {
            const step = hit.step;
            const vel = hit.vel !== undefined ? hit.vel : 1;
            if (step >= 0 && step < 16) {
              session.samplerPattern[slot][step].velocity = vel;
            }
          }
          added.push(`${slot}:[${steps.map(h => h.step).join(',')}]`);
        } else {
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.samplerPattern[slot][step].velocity = 1;
            }
          }
          added.push(`${slot}:[${steps.join(',')}]`);
        }
      }
    }

    // Get slot names from kit for nicer output
    const slotInfo = added.map(a => {
      const slotId = a.split(':')[0];
      const slotMeta = session.samplerKit.slots.find(s => s.id === slotId);
      return slotMeta ? `${slotMeta.short}:${a.split(':')[1]}` : a;
    });

    return `R9DS samples: ${slotInfo.join(', ')}`;
  }

  // R9DS Sampler - Tweak samples
  if (name === "tweak_samples") {
    const slot = input.slot;
    if (!session.samplerParams[slot]) {
      session.samplerParams[slot] = { level: 0.8, tune: 0, attack: 0, decay: 1, filter: 1, pan: 0 };
    }

    const tweaks = [];
    if (input.level !== undefined) {
      session.samplerParams[slot].level = input.level;
      tweaks.push(`level=${input.level}`);
    }
    if (input.tune !== undefined) {
      session.samplerParams[slot].tune = input.tune;
      tweaks.push(`tune=${input.tune}`);
    }
    if (input.attack !== undefined) {
      session.samplerParams[slot].attack = input.attack;
      tweaks.push(`attack=${input.attack}`);
    }
    if (input.decay !== undefined) {
      session.samplerParams[slot].decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }
    if (input.filter !== undefined) {
      session.samplerParams[slot].filter = input.filter;
      tweaks.push(`filter=${input.filter}`);
    }
    if (input.pan !== undefined) {
      session.samplerParams[slot].pan = input.pan;
      tweaks.push(`pan=${input.pan}`);
    }

    // Get slot name from kit
    const slotMeta = session.samplerKit?.slots.find(s => s.id === slot);
    const slotName = slotMeta ? slotMeta.name : slot;

    return `R9DS ${slotName}: ${tweaks.join(', ')}`;
  }

  // R9DS - Create kit from folder
  if (name === "create_kit") {
    const { source_folder, kit_id, kit_name, slots } = input;

    // Smart path resolution - try multiple locations
    const resolvePath = (p) => {
      // Already absolute
      if (p.startsWith('/')) return p;
      // Expand ~
      if (p.startsWith('~')) return p.replace('~', homedir());

      // Try common locations for relative paths
      const candidates = [
        p,                                              // As-is (cwd)
        join(homedir(), p),                             // ~/path
        join(homedir(), 'Documents', p),                // ~/Documents/path
        join(homedir(), 'Documents', 'Jambot', p),      // ~/Documents/Jambot/path (default project location)
        join(homedir(), 'Desktop', p),                  // ~/Desktop/path
        join(homedir(), 'Downloads', p),                // ~/Downloads/path
        join(homedir(), 'Music', p),                    // ~/Music/path
      ];

      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
      }
      return null; // Not found
    };

    const sourcePath = resolvePath(source_folder);

    // Check source folder exists
    if (!sourcePath) {
      const home = homedir();
      return `Error: Folder not found: ${source_folder}\n\nTried:\n- ${source_folder}\n- ~/${source_folder}\n- ~/Documents/${source_folder}\n- ~/Documents/Jambot/${source_folder}\n- ~/Desktop/${source_folder}\n- ~/Downloads/${source_folder}`;
    }

    // Find audio files
    const audioExtensions = ['.wav', '.aiff', '.aif', '.mp3', '.m4a', '.flac'];
    const files = readdirSync(sourcePath).filter(f => {
      const ext = f.toLowerCase().slice(f.lastIndexOf('.'));
      return audioExtensions.includes(ext);
    }).sort();

    if (files.length === 0) {
      return `Error: No audio files found in ${source_folder}. Looking for: ${audioExtensions.join(', ')}`;
    }

    // If no slots provided, return file list for user to name
    if (!slots || slots.length === 0) {
      const fileList = files.slice(0, 10).map((f, i) => `  ${i + 1}. ${f}`).join('\n');
      const extra = files.length > 10 ? `\n  ... and ${files.length - 10} more` : '';
      return `Found ${files.length} audio files in ${source_folder}:\n${fileList}${extra}\n\nAsk the user what to name each sound (or use auto-naming based on filenames). Then call create_kit again with the slots array.`;
    }

    // Validate we have slots
    if (slots.length > 10) {
      return `Error: Maximum 10 slots per kit. You provided ${slots.length}.`;
    }

    // Create kit directory
    const userKitsPath = join(homedir(), 'Documents', 'Jambot', 'kits');
    const kitPath = join(userKitsPath, kit_id);
    const samplesPath = join(kitPath, 'samples');

    if (existsSync(kitPath)) {
      return `Error: Kit "${kit_id}" already exists at ${kitPath}. Choose a different ID or delete the existing kit.`;
    }

    mkdirSync(samplesPath, { recursive: true });

    // Copy files and build kit.json
    const kitSlots = [];
    const copied = [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const slotId = `s${i + 1}`;
      const sourceFile = join(sourcePath, slot.file);

      if (!existsSync(sourceFile)) {
        return `Error: File not found: ${slot.file}`;
      }

      const destFile = join(samplesPath, `${slotId}.wav`);
      const ext = slot.file.toLowerCase().slice(slot.file.lastIndexOf('.'));

      // If already WAV, just copy. Otherwise convert with ffmpeg.
      if (ext === '.wav') {
        copyFileSync(sourceFile, destFile);
      } else {
        // Convert to WAV - try afconvert (macOS) first, then ffmpeg
        let converted = false;

        // On macOS, afconvert handles Apple audio formats better
        if (process.platform === 'darwin') {
          try {
            execSync(`afconvert -f WAVE -d LEI16@44100 "${sourceFile}" "${destFile}"`, {
              stdio: 'pipe'
            });
            converted = true;
          } catch {
            // afconvert failed, try ffmpeg
          }
        }

        // Fallback to ffmpeg
        if (!converted) {
          try {
            execSync(`"${ffmpegPath}" -y -i "${sourceFile}" -ar 44100 -ac 2 -sample_fmt s16 "${destFile}"`, {
              stdio: 'pipe'
            });
            converted = true;
          } catch (e) {
            return `Error converting ${slot.file}: Could not convert with afconvert or ffmpeg. Try converting to WAV manually first.`;
          }
        }
      }

      kitSlots.push({
        id: slotId,
        name: slot.name,
        short: slot.short || slot.name.slice(0, 2).toUpperCase()
      });

      copied.push(`${slotId}: ${slot.name} (${slot.file})`);
    }

    // Write kit.json
    const kitJson = {
      name: kit_name,
      slots: kitSlots
    };
    writeFileSync(join(kitPath, 'kit.json'), JSON.stringify(kitJson, null, 2));

    // Auto-load the kit into the session so it's ready to use immediately
    const newKit = loadKit(kit_id);
    session.samplerKit = newKit;
    session.samplerPattern = {};  // Clear any existing pattern
    // Initialize params for each slot
    for (const slot of newKit.slots) {
      session.samplerParams[slot.id] = {
        level: 0.8,
        tune: 0,
        attack: 0,
        decay: 1,
        filter: 1,
        pan: 0
      };
    }

    const slotSummary = newKit.slots.map(s => `${s.id}: ${s.name} (${s.short})`).join('\n');
    return `Created and loaded kit "${kit_name}" (${kit_id})\n\nSlots ready to use:\n${slotSummary}\n\nUse add_samples to program patterns. Example: add_samples with s1:[0,4,8,12] for kicks on beats.`;
  }

  return `Unknown tool: ${name}`;
}

async function renderSession(session, bars, filename) {
  // Dynamic imports to ensure fresh module resolution
  const { TR909Engine } = await import('../web/public/909/dist/machines/tr909/engine-v3.js');
  const TB303Mod = await import('../web/public/303/dist/machines/tb303/engine.js');
  const TB303Engine = TB303Mod.TB303Engine || TB303Mod.default;
  const SH101Mod = await import('../web/public/101/dist/machines/sh101/engine.js');
  const SH101Engine = SH101Mod.SH101Engine || SH101Mod.default;

  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const stepDuration = 60 / session.bpm / 4;
  const totalDuration = totalSteps * stepDuration + 2; // Extra time for release tails
  const sampleRate = 44100;

  const context = new OfflineAudioContext(2, totalDuration * sampleRate, sampleRate);

  // Workaround for node-web-audio-api WaveShaper.curve limitation:
  // node-web-audio-api throws "cannot assign curve twice" even on new WaveShapers
  // Patch createWaveShaper to return shapers with a safe curve setter
  const originalCreateWaveShaper = context.createWaveShaper.bind(context);
  context.createWaveShaper = function() {
    const shaper = originalCreateWaveShaper();
    let curveSet = false;
    const originalCurve = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(shaper), 'curve');
    Object.defineProperty(shaper, 'curve', {
      get() { return originalCurve?.get?.call(this); },
      set(value) {
        if (!curveSet) {
          curveSet = true;
          originalCurve?.set?.call(this, value);
        }
        // Silently ignore subsequent sets
      },
      configurable: true,
    });
    return shaper;
  };

  // Create master mixer
  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(context.destination);

  // === R9D9 (Drums) ===
  const drums = new TR909Engine({ context });
  const voiceNames = ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'];

  for (const name of voiceNames) {
    const voice = drums.voices.get(name);
    if (voice) {
      voice.connect(masterGain);
      const params = session.drumParams[name];
      if (params) {
        if (params.decay !== undefined) voice.decay = params.decay;
        if (params.tune !== undefined) voice.tune = params.tune;
        if (params.tone !== undefined) voice.tone = params.tone;
        if (params.level !== undefined) voice.level = params.level;
      }
    }
  }

  // === R3D3 (Bass) ===
  const bass = new TB303Engine({ context, engine: 'E1' });
  const bassVoice = bass.voices.get('bass');
  if (bassVoice) {
    bassVoice.connect(masterGain);
    // Apply bass params
    if (session.bassParams.waveform) {
      bass.setWaveform(session.bassParams.waveform);
    }
    Object.entries(session.bassParams).forEach(([key, value]) => {
      if (key !== 'waveform') {
        bass.setParameter(key, value);
      }
    });
  }

  // === R1D1 (Lead) ===
  const lead = new SH101Engine({ context, engine: 'E1' });
  // Apply lead params
  Object.entries(session.leadParams).forEach(([key, value]) => {
    lead.setParameter(key, value);
  });
  // Connect lead output (it connects internally to compressor, we need to route to master)
  lead.masterGain.connect(masterGain);

  // === R9DS (Sampler) ===
  const samplerVoices = new Map();
  if (session.samplerKit) {
    for (const slot of session.samplerKit.slots) {
      if (slot.buffer) {
        const voice = new SampleVoice(slot.id, context);
        // Decode the buffer (it's raw WAV bytes, need to convert to AudioBuffer)
        try {
          const audioBuffer = await context.decodeAudioData(slot.buffer.slice(0));
          voice.setBuffer(audioBuffer);
          voice.setMeta(slot.name, slot.short);
          // Apply params
          const params = session.samplerParams[slot.id];
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              voice.setParameter(key, value);
            });
          }
          voice.connect(masterGain);
          samplerVoices.set(slot.id, voice);
        } catch (e) {
          console.warn(`Could not decode sample for ${slot.id}:`, e.message);
        }
      }
    }
  }

  // === Schedule all notes ===
  const swingAmount = session.swing / 100;
  const maxSwingDelay = stepDuration * 0.5;

  // Helper to convert note name to frequency
  const noteToFreq = (note) => {
    const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const match = note.match(/^([A-G])([#b]?)(\d+)$/);
    if (!match) return 440;
    let n = noteMap[match[1]];
    if (match[2] === '#') n += 1;
    if (match[2] === 'b') n -= 1;
    const octave = parseInt(match[3]);
    const midi = n + (octave + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  for (let i = 0; i < totalSteps; i++) {
    let time = i * stepDuration;
    const step = i % 16;

    // Apply swing to off-beats
    if (step % 2 === 1) {
      time += swingAmount * maxSwingDelay;
    }

    // R9D9 drums
    for (const name of voiceNames) {
      if (session.drumPattern[name]?.[step]?.velocity > 0) {
        const voice = drums.voices.get(name);
        if (voice) voice.trigger(time, session.drumPattern[name][step].velocity);
      }
    }

    // R3D3 bass
    const bassStep = session.bassPattern[step];
    if (bassStep?.gate && bassVoice) {
      const freq = noteToFreq(bassStep.note);
      const nextStep = session.bassPattern[(step + 1) % 16];
      const shouldSlide = bassStep.slide && nextStep?.gate;
      const nextFreq = shouldSlide ? noteToFreq(nextStep.note) : null;
      bassVoice.trigger(time, 0.8, freq, bassStep.accent, shouldSlide, nextFreq);
    }

    // R1D1 lead
    const leadStep = session.leadPattern[step];
    if (leadStep?.gate) {
      const velocity = leadStep.accent ? 1.0 : 0.7;
      lead.playNote(leadStep.note, velocity, time);
      // Release on next rest (simplified)
      const nextLeadStep = session.leadPattern[(step + 1) % 16];
      if (!nextLeadStep?.slide && !nextLeadStep?.gate) {
        lead.noteOff(time + stepDuration * 0.9);
      }
    }

    // R9DS sampler
    for (const [slotId, voice] of samplerVoices) {
      if (session.samplerPattern[slotId]?.[step]?.velocity > 0) {
        voice.trigger(time, session.samplerPattern[slotId][step].velocity);
      }
    }
  }

  // Count what we rendered
  const hasDrums = Object.keys(session.drumPattern).length > 0;
  const hasBass = session.bassPattern.some(s => s.gate);
  const hasLead = session.leadPattern.some(s => s.gate);
  const hasSamples = Object.keys(session.samplerPattern).length > 0 && session.samplerKit;
  const synths = [hasDrums && 'R9D9', hasBass && 'R3D3', hasLead && 'R1D1', hasSamples && 'R9DS'].filter(Boolean);

  return context.startRendering().then(buffer => {
    const wav = audioBufferToWav(buffer);
    writeFileSync(filename, Buffer.from(wav));
    return `Rendered ${bars} bars at ${session.bpm} BPM (${synths.join('+') || 'empty'})`;
  });
}

// === WAV ENCODER ===
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
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

  const baseSystemPrompt = `You are Jambot, an AI that creates music with classic synths. You know your gear and you're here to make tracks, not write essays.

SYNTHS:
- R9D9 (TR-909 drums) - when user says "909" they mean this
- R3D3 (TB-303 acid bass) - when user says "303" they mean this
- R1D1 (SH-101 lead synth) - when user says "101" they mean this
- R9DS (sampler) - sample-based drums/sounds. Use list_kits to see available kits, load_kit to load one, add_samples for patterns

WORKFLOW: Complete the full task - create session, add instruments, AND render. System handles filenames.
For R9DS: load_kit first, then add_samples with slot patterns (s1-s10).

CREATING KITS: If user wants to create a kit from their own samples, use create_kit. First call it without slots to scan the folder and see what files are there. Then ask the user what to name each sound. Finally call create_kit again with the full slots array - this AUTOMATICALLY LOADS the kit so it's ready to use immediately. After creating a kit, you can go straight to add_samples and render - no need to call load_kit.

IMPORTANT: When you create a kit, remember the slot names (s1, s2, etc.) and what sounds they contain. Use those exact slot IDs in add_samples. The kit stays loaded in the session.

PERSONALITY: You're a producer who knows these machines inside out. Confident, not cocky. Keep it brief but flavorful - describe what you made like you're proud of it. Use music language naturally (four-on-the-floor, groove, punch, snap, thump, squelch). No emoji. No exclamation marks. Let the beat speak.

Example response after render:
"128 BPM, four-on-the-floor. Kick's tuned down for chest thump, snare cracking on 2 and 4, hats locked tight. Classic warehouse energy."`;

  while (true) {
    // Build system prompt with CURRENT session state (regenerated each iteration)
    const sessionContext = buildSessionContext(session);
    const systemPrompt = baseSystemPrompt + genreContext + sessionContext;
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

          // Get render path from context callback if this is a render
          let toolContext = { ...context };
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

  THE ACID SOUND
  High resonance + envelope mod = classic squelch
  Slides between notes = that rubbery feel

  EXAMPLES
  > "add an acid bass line in A minor"
  > "make it more squelchy"
  > "add some slides between notes"
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

  EXAMPLES
  > "add a synth lead melody"
  > "make it more plucky with short decay"
  > "add some sub bass to fatten it up"
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
