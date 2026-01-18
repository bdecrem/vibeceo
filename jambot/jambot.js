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

// Project management
import { listProjects } from './project.js';

// Producer-friendly parameter converters
import { convertTweaks, toEngine, getParamDef, formatValue } from './params/converters.js';

// Tool registry (replaces inline executeTool)
import { executeTool } from './tools/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// === PLATE REVERB GENERATOR ===
// Generates a realistic plate reverb impulse response using Dattorro-style techniques
function generatePlateReverbIR(context, params = {}) {
  const sampleRate = context.sampleRate;

  // Extract parameters with defaults
  const decay = Math.max(0.5, Math.min(10, params.decay ?? 2));        // seconds
  const damping = Math.max(0, Math.min(1, params.damping ?? 0.5));     // 0-1
  const predelayMs = Math.max(0, Math.min(100, params.predelay ?? 20)); // ms
  const modulation = Math.max(0, Math.min(1, params.modulation ?? 0.3)); // 0-1
  const lowcut = Math.max(20, Math.min(500, params.lowcut ?? 100));     // Hz
  const highcut = Math.max(2000, Math.min(20000, params.highcut ?? 8000)); // Hz
  const width = Math.max(0, Math.min(1, params.width ?? 1));           // 0-1

  // Calculate buffer length
  const predelaySamples = Math.floor((predelayMs / 1000) * sampleRate);
  const tailSamples = Math.floor(decay * sampleRate * 1.5); // Extra for natural decay
  const totalSamples = predelaySamples + tailSamples;

  const buffer = context.createBuffer(2, totalSamples, sampleRate);

  // Allpass filter coefficients for diffusion (Dattorro-style prime numbers)
  const diffusionDelays = [142, 107, 379, 277, 419, 181, 521, 233];
  const diffusionCoeff = 0.625;

  // Generate raw reverb tail for each channel
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);

    // Predelay: silence
    for (let i = 0; i < predelaySamples; i++) {
      data[i] = 0;
    }

    // Generate dense reverb tail
    const tailStart = predelaySamples;

    // Early reflections (first 50ms) - sparse, discrete
    const earlyEnd = tailStart + Math.floor(0.05 * sampleRate);
    const earlyReflections = [
      { delay: 0.007, gain: 0.8 },
      { delay: 0.011, gain: 0.7 },
      { delay: 0.019, gain: 0.6 },
      { delay: 0.027, gain: 0.5 },
      { delay: 0.031, gain: 0.45 },
      { delay: 0.041, gain: 0.35 },
    ];

    // Stereo offset for width
    const stereoPhase = ch === 0 ? 0 : Math.PI * 0.7 * width;
    const stereoMod = ch === 0 ? 1 : (1 - width * 0.5 + width * 0.5);

    for (const ref of earlyReflections) {
      const samplePos = tailStart + Math.floor(ref.delay * sampleRate);
      const stereoDelay = ch === 0 ? 0 : Math.floor(0.003 * sampleRate * width);
      if (samplePos + stereoDelay < data.length) {
        data[samplePos + stereoDelay] += ref.gain * (ch === 0 ? 1 : 0.95);
      }
    }

    // Late reverb tail - dense diffuse decay
    for (let i = earlyEnd; i < totalSamples; i++) {
      const t = (i - tailStart) / sampleRate;
      const tNorm = t / decay;

      // Base decay envelope (multi-stage for realism)
      const fastDecay = Math.exp(-4 * t / decay);
      const slowDecay = Math.exp(-2.5 * t / decay);
      const envelope = fastDecay * 0.6 + slowDecay * 0.4;

      // Damping: high frequencies decay faster over time
      // Simulate with reduced high-frequency content as time progresses
      const dampingFactor = 1 - (damping * tNorm * 0.8);

      // Generate diffuse noise with phase variation
      const phase1 = i * 0.0001 + stereoPhase;
      const phase2 = i * 0.00017 + stereoPhase * 1.3;

      // Multi-frequency noise for density
      let noise = 0;
      noise += (Math.random() * 2 - 1) * 0.5;
      noise += Math.sin(i * 0.01 + ch * Math.PI) * (Math.random() * 0.3);
      noise += Math.sin(i * 0.003 + phase1) * (Math.random() * 0.2);

      // Modulation: subtle pitch/phase wobble
      if (modulation > 0) {
        const modFreq = 0.5 + Math.random() * 1.5;
        const modDepth = modulation * 0.15;
        noise *= (1 + Math.sin(t * modFreq * Math.PI * 2 + ch * Math.PI * 0.5) * modDepth);
      }

      // Apply diffusion (smear the impulse)
      for (const delay of diffusionDelays) {
        const sourceIdx = i - delay;
        if (sourceIdx >= tailStart && sourceIdx < i) {
          noise += (data[sourceIdx] || 0) * diffusionCoeff * 0.1;
        }
      }

      // Combine
      data[i] = noise * envelope * dampingFactor * 0.4 * stereoMod;
    }

    // Apply filtering (lowcut and highcut simulation)
    // Simple IIR lowpass for highcut
    if (highcut < 15000) {
      const rc = 1 / (2 * Math.PI * highcut);
      const dt = 1 / sampleRate;
      const alpha = dt / (rc + dt);
      let prev = 0;
      for (let i = tailStart; i < totalSamples; i++) {
        prev = prev + alpha * (data[i] - prev);
        data[i] = prev;
      }
    }

    // Simple IIR highpass for lowcut
    if (lowcut > 30) {
      const rc = 1 / (2 * Math.PI * lowcut);
      const dt = 1 / sampleRate;
      const alpha = rc / (rc + dt);
      let prevIn = 0;
      let prevOut = 0;
      for (let i = tailStart; i < totalSamples; i++) {
        const input = data[i];
        data[i] = alpha * (prevOut + input - prevIn);
        prevIn = input;
        prevOut = data[i];
      }
    }
  }

  // Normalize to prevent clipping
  let maxAmp = 0;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < totalSamples; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(data[i]));
    }
  }
  if (maxAmp > 0.5) {
    const normFactor = 0.5 / maxAmp;
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < totalSamples; i++) {
        data[i] *= normFactor;
      }
    }
  }

  return buffer;
}

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

// === 909 KITS - imported from web app (single source of truth) ===
import { TR909_KITS } from '../web/public/909/dist/machines/tr909/presets.js';

// === 101 PRESETS - imported from web app (single source of truth) ===
import SH101Presets from '../web/public/101/dist/machines/sh101/presets.js';
const SH101_PRESETS = Object.values(SH101Presets);

// === SESSION STATE ===
export function createSession() {
  // Ensure user kits directory exists
  ensureUserKitsDir();

  return {
    bpm: 128,
    bars: 2,
    swing: 0,
    // R9D9 (drums)
    drumKit: 'bart-deep',  // Kit ID for engine selection
    drumPattern: {},
    drumParams: {},
    drumFlam: 0,              // Flam amount 0-1
    drumPatternLength: 16,    // Pattern length 1-16
    drumScale: '16th',        // '16th', '8th-triplet', '16th-triplet', '32nd'
    drumGlobalAccent: 1,      // Global accent multiplier 0-1
    drumVoiceEngines: {},     // Per-voice engine overrides { kick: 'E1', snare: 'E2', ... }
    drumUseSample: {},        // Sample mode for hats/cymbals { ch: true, oh: false, ... }
    drumAutomation: {},       // Per-step param automation { ch: { decay: [0.1, 0.2, ...], level: [...] }, ... }
    // R3D3 (bass)
    bassPattern: createEmptyBassPattern(),
    bassParams: {
      waveform: 'sawtooth',
      cutoff: 0.5,
      resonance: 0.5,
      envMod: 0.5,
      decay: 0.5,
      accent: 0.8,
      level: 0.8,
    },
    // R1D1 (lead)
    leadPreset: null,  // Preset ID for sound/pattern preset
    leadPattern: createEmptyLeadPattern(),
    leadParams: {
      // VCO
      vcoSaw: 0.5,
      vcoPulse: 0.5,
      pulseWidth: 0.5,
      // Sub oscillator
      subLevel: 0,
      subMode: 0,  // 0=off, 1=-1oct, 2=-2oct, 3=25%
      // Filter
      cutoff: 0.5,
      resonance: 0.3,
      envMod: 0.5,
      // Envelope
      attack: 0.01,
      decay: 0.3,
      sustain: 0.7,
      release: 0.3,
      // LFO
      lfoRate: 0.3,
      lfoWaveform: 'triangle',  // 'triangle', 'square', 'sh'
      lfoToPitch: 0,
      lfoToFilter: 0,
      lfoToPW: 0,
      // Output
      level: 0.8,
    },
    // R1D1 arpeggiator
    leadArp: {
      mode: 'off',     // 'off', 'up', 'down', 'updown'
      octaves: 1,
      hold: false,
    },
    // R9DS (sampler)
    samplerKit: null,        // Currently loaded kit { id, name, slots }
    samplerPattern: {},      // { s1: [{step, vel}, ...], s2: [...], ... }
    samplerParams: {},       // { s1: { level, tune, attack, decay, filter, pan }, ... }
    // MIXER (DAW-like routing and effects)
    mixer: {
      sends: {},             // { name: { effect: 'reverb', params: { mix: 0.3 } } }
      voiceRouting: {},      // { voiceId: { sends: { busName: level }, inserts: [...] } }
      channelInserts: {},    // { channelName: [{ type: 'eq', params: {...} }] }
      masterInserts: [],     // [{ type: 'eq', preset: 'master' }]
      masterVolume: 0.8,
    },
    // SONG MODE (patterns + arrangement)
    patterns: {
      drums: {},    // { 'A': { pattern, params, automation, flam, length, scale, accent, engines, useSample } }
      bass: {},     // { 'A': { pattern, params } }
      lead: {},     // { 'A': { pattern, params, arp } }
      sampler: {},  // { 'A': { pattern, params } }
    },
    currentPattern: {
      drums: 'A',
      bass: 'A',
      lead: 'A',
      sampler: 'A',
    },
    arrangement: [],  // [{ bars: 4, patterns: { drums: 'A', bass: 'A', lead: 'A', sampler: 'A' } }, ...]
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
    name: "list_909_kits",
    description: "List available 909 kits (sound presets) for R9D9",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_909_kit",
    description: "Load a 909 kit (sound preset) for R9D9. Kits set the engine type and default voice parameters.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID (e.g., 'bart-deep', 'punchy', 'boomy')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "list_101_presets",
    description: "List available 101 presets (sound + pattern presets) for R1D1 lead synth",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_101_preset",
    description: "Load a 101 preset for R1D1 lead synth. Presets include sound parameters and optionally a pattern.",
    input_schema: {
      type: "object",
      properties: {
        preset: { type: "string", description: "Preset ID (e.g., 'classicLead', 'fatBass', 'acidLine')" },
        includePattern: { type: "boolean", description: "Also load the preset's pattern (default: true)" }
      },
      required: ["preset"]
    }
  },
  {
    name: "tweak_drums",
    description: "Adjust drum voice parameters. UNITS: level in dB (-60 to +6), tune in semitones (-12 to +12), decay/attack/tone/snappy/sweep as 0-100, hi-hat tone in Hz (4000-16000). Use mute:true to silence a voice.",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to tweak"
        },
        mute: { type: "boolean", description: "Mute this voice (sets level to -60dB, effectively silent)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity, -6dB = half volume" },
        tune: { type: "number", description: "Pitch in semitones (-12 to +12). -2 = 2 semitones down" },
        decay: { type: "number", description: "Decay 0-100. 0=tight/punchy, 100=long/boomy" },
        tone: { type: "number", description: "Brightness. For hats: Hz (4000-16000). Others: 0-100 (0=dark, 100=bright)" },
        attack: { type: "number", description: "Kick click intensity 0-100. 0=soft, 100=clicky (kick only)" },
        sweep: { type: "number", description: "Kick pitch envelope 0-100. 0=flat, 100=full sweep (kick only)" },
        snappy: { type: "number", description: "Snare wire rattle 0-100 (snare only)" },
        engine: { type: "string", enum: ["E1", "E2"], description: "Engine version: E1=simpler, E2=authentic" },
        useSample: { type: "boolean", description: "Use real 909 samples (ch, oh, crash, ride only)" }
      },
      required: ["voice"]
    }
  },
  {
    name: "set_drum_groove",
    description: "Set global R9D9 groove parameters: flam, pattern length, scale mode, and accent.",
    input_schema: {
      type: "object",
      properties: {
        flam: { type: "number", description: "Flam amount (0-1). Adds ghost note before main hit for fuller sound." },
        patternLength: { type: "number", description: "Pattern length in steps (1-16). Default 16." },
        scale: { type: "string", enum: ["16th", "8th-triplet", "16th-triplet", "32nd"], description: "Time scale. 16th=standard, triplets for shuffle, 32nd for double-time." },
        globalAccent: { type: "number", description: "Global accent strength (0-1). Multiplier for accented hits." }
      }
    }
  },
  {
    name: "automate_drums",
    description: "Add per-step parameter automation to a drum voice. This is 'knob mashing' - dynamic parameter changes over time. Provide an array of 16 values for the parameter, one per step. Use null to keep the default value for that step. Uses SAME UNITS as tweak_drums: decay/attack/tone/sweep/snappy are 0-100, level is dB (-60 to +6), tune is semitones (±12).",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to automate"
        },
        param: {
          type: "string",
          enum: ["decay", "tune", "tone", "level", "attack", "sweep", "snappy"],
          description: "Which parameter to automate"
        },
        values: {
          type: "array",
          description: "Array of 16 values (one per step). Use null to keep default. Same units as tweak_drums. Example for decay: [20, 80, 30, 90, null, 50, ...] where 0=tight, 100=loose.",
          items: { type: ["number", "null"] }
        }
      },
      required: ["voice", "param", "values"]
    }
  },
  {
    name: "clear_automation",
    description: "Clear automation from a drum voice. Use this before saving a pattern that should NOT have knob-mashing. Call without params to clear ALL automation.",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to clear automation from. Omit to clear all voices."
        },
        param: {
          type: "string",
          enum: ["decay", "tune", "tone", "level", "attack", "sweep", "snappy"],
          description: "Which parameter to clear. Omit to clear all params for the voice."
        }
      },
      required: []
    }
  },
  {
    name: "render",
    description: "Render the current session to a WAV file. If arrangement is set, renders the full song. Otherwise renders current patterns for specified bars.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Output filename (without .wav extension)" },
        bars: { type: "number", description: "Number of bars to render (default: 2, ignored if arrangement is set)" }
      },
      required: ["filename"]
    }
  },
  // SONG MODE (patterns + arrangement)
  {
    name: "save_pattern",
    description: "Save the current working pattern for an instrument to a named slot (A, B, C, etc). This captures the current pattern, params, and automation.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler"], description: "Which instrument's pattern to save" },
        name: { type: "string", description: "Pattern name (A, B, C, etc)" }
      },
      required: ["instrument", "name"]
    }
  },
  {
    name: "load_pattern",
    description: "Load a saved pattern into the current working pattern for an instrument. This replaces the current pattern with the saved one.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler"], description: "Which instrument's pattern to load" },
        name: { type: "string", description: "Pattern name to load (A, B, C, etc)" }
      },
      required: ["instrument", "name"]
    }
  },
  {
    name: "copy_pattern",
    description: "Copy a saved pattern to a new name. Useful for creating variations.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler"], description: "Which instrument" },
        from: { type: "string", description: "Source pattern name (A, B, etc)" },
        to: { type: "string", description: "Destination pattern name" }
      },
      required: ["instrument", "from", "to"]
    }
  },
  {
    name: "list_patterns",
    description: "List all saved patterns for each instrument",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "set_arrangement",
    description: "Set the song arrangement. Each section specifies bars and which pattern each instrument plays. Patterns loop to fill the section. Omit an instrument to silence it for that section.",
    input_schema: {
      type: "object",
      properties: {
        sections: {
          type: "array",
          description: "Array of sections. Each section: {bars: 4, drums: 'A', bass: 'A', lead: 'B', sampler: 'A'}",
          items: {
            type: "object",
            properties: {
              bars: { type: "number", description: "Number of bars for this section" },
              drums: { type: "string", description: "Drum pattern name (or omit to silence)" },
              bass: { type: "string", description: "Bass pattern name (or omit to silence)" },
              lead: { type: "string", description: "Lead pattern name (or omit to silence)" },
              sampler: { type: "string", description: "Sampler pattern name (or omit to silence)" }
            },
            required: ["bars"]
          }
        }
      },
      required: ["sections"]
    }
  },
  {
    name: "clear_arrangement",
    description: "Clear the arrangement to go back to single-pattern mode",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "show_arrangement",
    description: "Show the current arrangement and all saved patterns",
    input_schema: {
      type: "object",
      properties: {},
      required: []
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
    description: "Adjust R3D3 bass synth parameters. UNITS: level in dB (-60 to +6), cutoff in Hz (100-10000), resonance/envMod/decay/accent as 0-100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        mute: { type: "boolean", description: "Mute bass (sets level to -60dB, effectively silent)" },
        waveform: { type: "string", enum: ["sawtooth", "square"], description: "Oscillator waveform" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        cutoff: { type: "number", description: "Filter cutoff in Hz (100-10000). 500=dark, 2000=medium, 5000=bright" },
        resonance: { type: "number", description: "Filter resonance 0-100. 0=clean, 80+=screaming acid" },
        envMod: { type: "number", description: "Filter envelope depth 0-100. Higher = more wah on each note" },
        decay: { type: "number", description: "Filter envelope decay 0-100. How quickly filter closes" },
        accent: { type: "number", description: "Accent intensity 0-100. How much accented notes pop" }
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
    description: "Adjust R1D1 lead synth parameters. UNITS: level in dB, cutoff in Hz (20-16000), all others 0-100. LFO pitch mod in semitones. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        // Output
        mute: { type: "boolean", description: "Mute lead (sets level to -60dB, effectively silent)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        // Oscillators
        vcoSaw: { type: "number", description: "Sawtooth level 0-100" },
        vcoPulse: { type: "number", description: "Pulse/square level 0-100" },
        pulseWidth: { type: "number", description: "Pulse width 5-95. 50=square wave" },
        // Sub-oscillator
        subLevel: { type: "number", description: "Sub-oscillator level 0-100. Adds low-end beef" },
        subMode: { type: "number", description: "Sub mode: 0=-1oct square, 1=-1oct pulse, 2=-2oct pulse" },
        // Filter
        cutoff: { type: "number", description: "Filter cutoff in Hz (20-16000). 500=dark, 2000=medium" },
        resonance: { type: "number", description: "Filter resonance 0-100. 100=self-oscillates" },
        envMod: { type: "number", description: "Filter envelope depth 0-100" },
        // Envelope
        attack: { type: "number", description: "Envelope attack 0-100. 0=instant, 100=slow" },
        decay: { type: "number", description: "Envelope decay 0-100" },
        sustain: { type: "number", description: "Envelope sustain level 0-100" },
        release: { type: "number", description: "Envelope release 0-100. How long note tails" },
        // LFO
        lfoRate: { type: "number", description: "LFO speed 0-100. 0=slow wobble, 100=fast" },
        lfoWaveform: { type: "string", enum: ["triangle", "square", "random"], description: "LFO shape" },
        lfoToPitch: { type: "number", description: "LFO to pitch in semitones (0-24). Vibrato depth" },
        lfoToFilter: { type: "number", description: "LFO to filter 0-100. Wah/wobble depth" },
        lfoToPW: { type: "number", description: "LFO to pulse width 0-100. PWM movement" }
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
  {
    name: "list_projects",
    description: "List all saved projects. Use when user asks 'what projects do I have' or 'show my projects'.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "open_project",
    description: "Open an existing project by name or folder. Use when user says 'open project X' or 'continue working on X'.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name or folder name to search for" }
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
    description: "Tweak R9DS sample parameters. UNITS: level in dB, tune in semitones, attack/decay 0-100, filter in Hz, pan L/R -100 to +100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        slot: { type: "string", description: "Which slot to tweak (s1-s10)" },
        mute: { type: "boolean", description: "Mute this sample slot (sets level to -60dB, effectively silent)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        tune: { type: "number", description: "Pitch in semitones (-24 to +24)" },
        attack: { type: "number", description: "Fade in 0-100. 0=instant" },
        decay: { type: "number", description: "Sample length 0-100. 0=short chop, 100=full sample" },
        filter: { type: "number", description: "Lowpass filter in Hz (200-20000). 20000=no filter" },
        pan: { type: "number", description: "Stereo position (-100=L, 0=C, +100=R)" }
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
  },
  // === MIXER TOOLS ===
  {
    name: "create_send",
    description: "Create a send bus with an effect. For reverb: Dattorro plate algorithm with full controls. Multiple voices can send to the same bus.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the send bus (e.g., 'reverb', 'delay')" },
        effect: { type: "string", enum: ["reverb", "eq"], description: "Type of effect for the bus" },
        // Plate reverb parameters
        decay: { type: "number", description: "Reverb tail length in seconds (0.5-10, default 2). Short for tight drums, long for pads." },
        damping: { type: "number", description: "High-frequency rolloff (0-1, default 0.5). 0=bright/shimmery, 1=dark/warm." },
        predelay: { type: "number", description: "Gap before reverb starts in ms (0-100, default 20). Adds clarity, separates dry from wet." },
        modulation: { type: "number", description: "Subtle pitch wobble (0-1, default 0.3). Adds movement and shimmer." },
        lowcut: { type: "number", description: "Remove low frequencies from reverb in Hz (20-500, default 100). Keeps bass tight." },
        highcut: { type: "number", description: "Remove high frequencies from reverb in Hz (2000-20000, default 8000). Tames harshness." },
        width: { type: "number", description: "Stereo spread (0-1, default 1). 0=mono, 1=full stereo." },
        mix: { type: "number", description: "Wet/dry balance (0-1, default 0.3). How much reverb in the send output." }
      },
      required: ["name", "effect"]
    }
  },
  {
    name: "tweak_reverb",
    description: "Adjust reverb parameters on an existing send bus. Use this to fine-tune the reverb sound.",
    input_schema: {
      type: "object",
      properties: {
        send: { type: "string", description: "Name of the reverb send bus to tweak" },
        decay: { type: "number", description: "Tail length in seconds (0.5-10)" },
        damping: { type: "number", description: "High-frequency rolloff (0-1). 0=bright, 1=dark." },
        predelay: { type: "number", description: "Gap before reverb in ms (0-100)" },
        modulation: { type: "number", description: "Pitch wobble for shimmer (0-1)" },
        lowcut: { type: "number", description: "Low cut frequency in Hz (20-500)" },
        highcut: { type: "number", description: "High cut frequency in Hz (2000-20000)" },
        width: { type: "number", description: "Stereo spread (0-1)" },
        mix: { type: "number", description: "Wet/dry balance (0-1)" }
      },
      required: ["send"]
    }
  },
  {
    name: "route_to_send",
    description: "Route a voice or channel to a send bus. Use this to add reverb/effects to specific sounds.",
    input_schema: {
      type: "object",
      properties: {
        voice: { type: "string", description: "Voice to route (e.g., 'kick', 'snare', 'ch', 'oh', 'bass', 'lead')" },
        send: { type: "string", description: "Name of the send bus to route to" },
        level: { type: "number", description: "Send level (0-1, default 0.3)" }
      },
      required: ["voice", "send"]
    }
  },
  {
    name: "add_channel_insert",
    description: "Add an insert effect to a channel or individual drum voice. Supports per-voice filtering on drums (kick, snare, ch, etc).",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["drums", "bass", "lead", "sampler", "kick", "snare", "clap", "rimshot", "ch", "oh", "ltom", "mtom", "htom", "crash", "ride"], description: "Channel or drum voice to add effect to" },
        effect: { type: "string", enum: ["eq", "filter", "ducker"], description: "Type of effect" },
        preset: { type: "string", description: "Effect preset (eq: 'acidBass'/'crispHats'/'warmPad'; filter: 'dubDelay'/'telephone'/'lofi')" },
        params: {
          type: "object",
          description: "Effect parameters (eq: highpass, lowGain, midGain, midFreq, highGain; filter: mode, cutoff, resonance; ducker: amount, trigger)"
        }
      },
      required: ["channel", "effect"]
    }
  },
  {
    name: "remove_channel_insert",
    description: "Remove a channel insert effect (filter, eq, ducker). Use to clear effects from a pattern before saving.",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["drums", "bass", "lead", "sampler", "kick", "snare", "clap", "rimshot", "ch", "oh", "ltom", "mtom", "htom", "crash", "ride"], description: "Channel or drum voice to remove effect from" },
        effect: { type: "string", enum: ["eq", "filter", "ducker", "all"], description: "Type of effect to remove, or 'all' to clear all inserts" }
      },
      required: ["channel"]
    }
  },
  {
    name: "add_sidechain",
    description: "Add sidechain ducking - make one sound duck when another plays (classic pump effect).",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "What to duck (e.g., 'bass', 'lead', 'sampler')" },
        trigger: { type: "string", description: "What triggers the duck (e.g., 'kick')" },
        amount: { type: "number", description: "How much to duck (0-1, default 0.5)" }
      },
      required: ["target", "trigger"]
    }
  },
  {
    name: "add_master_insert",
    description: "Add an insert effect to the master bus. Affects the entire mix.",
    input_schema: {
      type: "object",
      properties: {
        effect: { type: "string", enum: ["eq", "reverb"], description: "Type of effect" },
        preset: { type: "string", description: "Effect preset (eq: 'master', reverb: 'plate'/'room')" },
        params: { type: "object", description: "Effect parameters" }
      },
      required: ["effect"]
    }
  },
  {
    name: "analyze_render",
    description: "Analyze the last rendered WAV file. Returns levels, frequency balance, sidechain detection, and recommendations.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file to analyze (defaults to last rendered)" }
      },
      required: []
    }
  },
  {
    name: "show_mixer",
    description: "Show current mixer configuration (sends, routing, effects).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
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
// DEPRECATED: Now using tools/index.js registry system
// This inline function is kept for reference but not exported
// context is optional: { renderPath, onRender }
async function _legacyExecuteTool(name, input, session, context = {}) {
  if (name === "create_session") {
    session.bpm = input.bpm;
    session.swing = 0;
    // Reset R9D9 (drums) - load default kit with its parameters
    const defaultKit = TR909_KITS.find(k => k.id === 'bart-deep');
    session.drumKit = 'bart-deep';
    session.drumPattern = {};
    session.drumParams = {};
    // Load default kit's voice parameters so agent knows the values
    if (defaultKit?.voiceParams) {
      for (const [voice, params] of Object.entries(defaultKit.voiceParams)) {
        session.drumParams[voice] = { ...params };
      }
    }
    session.drumFlam = 0;
    session.drumPatternLength = 16;
    session.drumScale = '16th';
    session.drumGlobalAccent = 1;
    session.drumVoiceEngines = {};
    session.drumUseSample = {};
    session.drumAutomation = {};
    // Reset R3D3 (bass)
    session.bassPattern = createEmptyBassPattern();
    session.bassParams = { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.5, envMod: 0.5, decay: 0.5, accent: 0.8, level: 0.8 };
    // Reset R1D1 (lead)
    session.leadPreset = null;
    session.leadPattern = createEmptyLeadPattern();
    session.leadParams = {
      vcoSaw: 0.5, vcoPulse: 0.5, pulseWidth: 0.5,
      subLevel: 0, subMode: 0,
      cutoff: 0.5, resonance: 0.3, envMod: 0.5,
      attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3,
      lfoRate: 0.3, lfoWaveform: 'triangle', lfoToPitch: 0, lfoToFilter: 0, lfoToPW: 0,
      level: 0.8
    };
    // Reset R9DS (sampler) - keep kit loaded, just clear pattern
    session.samplerPattern = {};
    session.samplerParams = {};
    return `Session created at ${input.bpm} BPM`;
  }

  if (name === "set_swing") {
    session.swing = Math.max(0, Math.min(100, input.amount));
    return `Swing set to ${session.swing}%`;
  }

  // === SONG MODE TOOLS ===

  // Save current pattern to a named slot
  if (name === "save_pattern") {
    const { instrument, name: patternName } = input;

    // Helper: get channel inserts for an instrument
    const getInsertsForInstrument = (inst) => {
      const inserts = session.mixer?.channelInserts || {};
      // For drums, include 'drums' channel + all voice channels
      if (inst === 'drums') {
        const voiceNames = ['kick', 'snare', 'clap', 'rimshot', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'crash', 'ride'];
        const result = {};
        if (inserts['drums']) result['drums'] = JSON.parse(JSON.stringify(inserts['drums']));
        for (const v of voiceNames) {
          if (inserts[v]) result[v] = JSON.parse(JSON.stringify(inserts[v]));
        }
        return Object.keys(result).length > 0 ? result : null;
      }
      // For bass/lead/sampler, just the instrument channel
      if (inserts[inst]) return { [inst]: JSON.parse(JSON.stringify(inserts[inst])) };
      return null;
    };

    if (instrument === 'drums') {
      session.patterns.drums[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.drumPattern)),
        params: JSON.parse(JSON.stringify(session.drumParams)),
        automation: JSON.parse(JSON.stringify(session.drumAutomation)),
        flam: session.drumFlam,
        length: session.drumPatternLength,
        scale: session.drumScale,
        accent: session.drumGlobalAccent,
        engines: JSON.parse(JSON.stringify(session.drumVoiceEngines)),
        useSample: JSON.parse(JSON.stringify(session.drumUseSample)),
        channelInserts: getInsertsForInstrument('drums'),
      };
      session.currentPattern.drums = patternName;
      return `Saved drums pattern "${patternName}"`;
    }

    if (instrument === 'bass') {
      session.patterns.bass[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.bassPattern)),
        params: JSON.parse(JSON.stringify(session.bassParams)),
        channelInserts: getInsertsForInstrument('bass'),
      };
      session.currentPattern.bass = patternName;
      return `Saved bass pattern "${patternName}"`;
    }

    if (instrument === 'lead') {
      session.patterns.lead[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.leadPattern)),
        params: JSON.parse(JSON.stringify(session.leadParams)),
        arp: JSON.parse(JSON.stringify(session.leadArp)),
        channelInserts: getInsertsForInstrument('lead'),
      };
      session.currentPattern.lead = patternName;
      return `Saved lead pattern "${patternName}"`;
    }

    if (instrument === 'sampler') {
      session.patterns.sampler[patternName] = {
        pattern: JSON.parse(JSON.stringify(session.samplerPattern)),
        params: JSON.parse(JSON.stringify(session.samplerParams)),
        channelInserts: getInsertsForInstrument('sampler'),
      };
      session.currentPattern.sampler = patternName;
      return `Saved sampler pattern "${patternName}"`;
    }

    return `Unknown instrument: ${instrument}`;
  }

  // Load a saved pattern into current working pattern
  if (name === "load_pattern") {
    const { instrument, name: patternName } = input;

    // Helper: restore channel inserts for an instrument
    const restoreInserts = (inserts) => {
      if (!inserts) return;
      if (!session.mixer) session.mixer = { sends: {}, voiceRouting: {}, channelInserts: {}, masterInserts: [], masterVolume: 0.8 };
      if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
      for (const [channel, insertList] of Object.entries(inserts)) {
        session.mixer.channelInserts[channel] = JSON.parse(JSON.stringify(insertList));
      }
    };

    // Helper: clear channel inserts for an instrument
    const clearInsertsForInstrument = (inst) => {
      if (!session.mixer?.channelInserts) return;
      if (inst === 'drums') {
        const voiceNames = ['drums', 'kick', 'snare', 'clap', 'rimshot', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'crash', 'ride'];
        for (const v of voiceNames) delete session.mixer.channelInserts[v];
      } else {
        delete session.mixer.channelInserts[inst];
      }
    };

    if (instrument === 'drums') {
      const saved = session.patterns.drums[patternName];
      if (!saved) return `No drums pattern "${patternName}" found`;
      session.drumPattern = JSON.parse(JSON.stringify(saved.pattern));
      session.drumParams = JSON.parse(JSON.stringify(saved.params));
      session.drumAutomation = JSON.parse(JSON.stringify(saved.automation || {}));
      session.drumFlam = saved.flam || 0;
      session.drumPatternLength = saved.length || 16;
      session.drumScale = saved.scale || '16th';
      session.drumGlobalAccent = saved.accent || 1;
      session.drumVoiceEngines = JSON.parse(JSON.stringify(saved.engines || {}));
      session.drumUseSample = JSON.parse(JSON.stringify(saved.useSample || {}));
      clearInsertsForInstrument('drums');
      restoreInserts(saved.channelInserts);
      session.currentPattern.drums = patternName;
      return `Loaded drums pattern "${patternName}"`;
    }

    if (instrument === 'bass') {
      const saved = session.patterns.bass[patternName];
      if (!saved) return `No bass pattern "${patternName}" found`;
      session.bassPattern = JSON.parse(JSON.stringify(saved.pattern));
      session.bassParams = JSON.parse(JSON.stringify(saved.params));
      clearInsertsForInstrument('bass');
      restoreInserts(saved.channelInserts);
      session.currentPattern.bass = patternName;
      return `Loaded bass pattern "${patternName}"`;
    }

    if (instrument === 'lead') {
      const saved = session.patterns.lead[patternName];
      if (!saved) return `No lead pattern "${patternName}" found`;
      session.leadPattern = JSON.parse(JSON.stringify(saved.pattern));
      session.leadParams = JSON.parse(JSON.stringify(saved.params));
      session.leadArp = JSON.parse(JSON.stringify(saved.arp || { mode: 'off', octaves: 1, hold: false }));
      clearInsertsForInstrument('lead');
      restoreInserts(saved.channelInserts);
      session.currentPattern.lead = patternName;
      return `Loaded lead pattern "${patternName}"`;
    }

    if (instrument === 'sampler') {
      const saved = session.patterns.sampler[patternName];
      if (!saved) return `No sampler pattern "${patternName}" found`;
      session.samplerPattern = JSON.parse(JSON.stringify(saved.pattern));
      session.samplerParams = JSON.parse(JSON.stringify(saved.params));
      clearInsertsForInstrument('sampler');
      restoreInserts(saved.channelInserts);
      session.currentPattern.sampler = patternName;
      return `Loaded sampler pattern "${patternName}"`;
    }

    return `Unknown instrument: ${instrument}`;
  }

  // Copy a pattern to a new name
  if (name === "copy_pattern") {
    const { instrument, from, to } = input;
    const patterns = session.patterns[instrument];
    if (!patterns) return `Unknown instrument: ${instrument}`;
    if (!patterns[from]) return `No ${instrument} pattern "${from}" found`;

    patterns[to] = JSON.parse(JSON.stringify(patterns[from]));
    return `Copied ${instrument} pattern "${from}" to "${to}"`;
  }

  // List all saved patterns
  if (name === "list_patterns") {
    const lines = [];
    for (const instrument of ['drums', 'bass', 'lead', 'sampler']) {
      const patterns = session.patterns[instrument];
      const names = Object.keys(patterns);
      const current = session.currentPattern[instrument];
      if (names.length > 0) {
        const list = names.map(n => n === current ? `[${n}]` : n).join(', ');
        lines.push(`${instrument}: ${list}`);
      } else {
        lines.push(`${instrument}: (none saved)`);
      }
    }
    return lines.join('\n');
  }

  // Set the song arrangement
  if (name === "set_arrangement") {
    session.arrangement = input.sections.map(s => ({
      bars: s.bars,
      patterns: {
        drums: s.drums || null,
        bass: s.bass || null,
        lead: s.lead || null,
        sampler: s.sampler || null,
      }
    }));

    const totalBars = session.arrangement.reduce((sum, s) => sum + s.bars, 0);
    const sectionCount = session.arrangement.length;
    return `Arrangement set: ${sectionCount} sections, ${totalBars} bars total`;
  }

  // Clear arrangement
  if (name === "clear_arrangement") {
    session.arrangement = [];
    return `Arrangement cleared. Back to single-pattern mode.`;
  }

  // Show arrangement and patterns
  if (name === "show_arrangement") {
    const lines = [];

    // Show patterns
    lines.push('PATTERNS:');
    for (const instrument of ['drums', 'bass', 'lead', 'sampler']) {
      const patterns = session.patterns[instrument];
      const names = Object.keys(patterns);
      if (names.length > 0) {
        lines.push(`  ${instrument}: ${names.join(', ')}`);
      }
    }

    // Show arrangement
    if (session.arrangement.length > 0) {
      lines.push('\nARRANGEMENT:');
      session.arrangement.forEach((section, i) => {
        const parts = [];
        if (section.patterns.drums) parts.push(`drums:${section.patterns.drums}`);
        if (section.patterns.bass) parts.push(`bass:${section.patterns.bass}`);
        if (section.patterns.lead) parts.push(`lead:${section.patterns.lead}`);
        if (section.patterns.sampler) parts.push(`sampler:${section.patterns.sampler}`);
        lines.push(`  ${i + 1}. ${section.bars} bars — ${parts.join(', ') || '(silent)'}`);
      });
      const totalBars = session.arrangement.reduce((sum, s) => sum + s.bars, 0);
      lines.push(`\nTotal: ${totalBars} bars`);
    } else {
      lines.push('\nARRANGEMENT: (not set - single pattern mode)');
    }

    return lines.join('\n');
  }

  // R9D9 - List 909 kits
  if (name === "list_909_kits") {
    const kitList = TR909_KITS.map(k => `  ${k.id} - ${k.name}: ${k.description}`).join('\n');
    return `Available 909 kits:\n${kitList}`;
  }

  // R9D9 - Load 909 kit
  if (name === "load_909_kit") {
    const kit = TR909_KITS.find(k => k.id === input.kit);
    if (!kit) {
      const available = TR909_KITS.map(k => k.id).join(', ');
      return `Unknown kit: ${input.kit}. Available: ${available}`;
    }
    session.drumKit = kit.id;

    // Copy kit's voiceParams into session.drumParams (producer units)
    // This allows the agent to see/report current values
    if (kit.voiceParams) {
      for (const [voice, params] of Object.entries(kit.voiceParams)) {
        session.drumParams[voice] = { ...params };
      }
    }

    // Build a summary of what was set
    const paramSummary = kit.voiceParams && Object.keys(kit.voiceParams).length > 0
      ? Object.entries(kit.voiceParams).map(([voice, params]) => {
          const paramList = Object.entries(params).map(([p, v]) => `${p}=${v}`).join(', ');
          return `${voice}: ${paramList}`;
        }).join('; ')
      : 'default params';

    return `Loaded 909 kit "${kit.name}" (${kit.engine} engine). Set: ${paramSummary}`;
  }

  // R1D1 - List 101 presets
  if (name === "list_101_presets") {
    const presetList = SH101_PRESETS.map(p => `  ${p.id} - ${p.name}: ${p.description}`).join('\n');
    return `Available 101 presets:\n${presetList}`;
  }

  // R1D1 - Load 101 preset
  if (name === "load_101_preset") {
    const preset = SH101_PRESETS.find(p => p.id === input.preset);
    if (!preset) {
      const available = SH101_PRESETS.map(p => p.id).join(', ');
      return `Unknown preset: ${input.preset}. Available: ${available}`;
    }
    session.leadPreset = preset.id;

    // Apply ALL preset parameters to leadParams
    if (preset.parameters) {
      Object.entries(preset.parameters).forEach(([key, value]) => {
        // Map 'volume' to 'level' for jambot consistency
        const paramKey = key === 'volume' ? 'level' : key;
        session.leadParams[paramKey] = value;
      });
    }

    // Apply preset BPM
    const details = [];
    if (preset.bpm) {
      session.bpm = preset.bpm;
      details.push(`${preset.bpm} BPM`);
    }

    // Load the pattern (default: true)
    const includePattern = input.includePattern !== false;
    if (includePattern && preset.pattern) {
      session.leadPattern = preset.pattern.map(step => ({
        note: step.note || 'C3',
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false,
      }));
      details.push('pattern');
    }

    // Apply arpeggiator settings if present
    if (preset.arp) {
      session.leadArp = {
        mode: preset.arp.mode || 'off',
        octaves: preset.arp.octaves || 1,
        hold: preset.arp.hold || false,
      };
      details.push(`arp: ${preset.arp.mode}`);
    }

    const detailsMsg = details.length > 0 ? ` (${details.join(', ')})` : '';
    return `Loaded 101 preset "${preset.name}"${detailsMsg}`;
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
          added.push(`${voice}:${steps.length}`);
        } else {
          const defaultVel = (voice === 'ch' || voice === 'oh') ? 0.7 : 1;
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.drumPattern[voice][step].velocity = defaultVel;
            }
          }
          added.push(`${voice}:${steps.length}`);
        }
      }
    }

    return `R9D9 drums: ${added.join(', ')}`;
  }

  // R9D9 - Tweak drums
  // Stores producer units directly: dB for level, semitones for tune, 0-100 for decay/attack/sweep/snappy, Hz for hi-hat tone
  // Conversion to engine units happens at render time
  if (name === "tweak_drums") {
    const voice = input.voice;
    if (!session.drumParams[voice]) {
      session.drumParams[voice] = {};
    }

    const tweaks = [];

    // Store producer units directly (conversion happens at render time)

    // Mute: convenience alias for level=-60 (silent)
    if (input.mute === true) {
      session.drumParams[voice].level = -60;
      tweaks.push('muted');
    }

    // Level: dB (-60 to +6)
    if (input.level !== undefined) {
      session.drumParams[voice].level = input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Tune: semitones (±12)
    if (input.tune !== undefined) {
      session.drumParams[voice].tune = input.tune;
      tweaks.push(`tune=${input.tune > 0 ? '+' : ''}${input.tune}st`);
    }

    // Decay: 0-100
    if (input.decay !== undefined) {
      session.drumParams[voice].decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }

    // Tone: Hz for hats, 0-100 for others
    if (input.tone !== undefined) {
      const def = getParamDef('r9d9', voice, 'tone');
      session.drumParams[voice].tone = input.tone;
      if (def?.unit === 'Hz') {
        tweaks.push(`tone=${input.tone}Hz`);
      } else {
        tweaks.push(`tone=${input.tone}`);
      }
    }

    // Attack: 0-100 (kick only)
    if (input.attack !== undefined) {
      session.drumParams[voice].attack = input.attack;
      tweaks.push(`attack=${input.attack}`);
    }

    // Sweep: 0-100 (kick only)
    if (input.sweep !== undefined) {
      session.drumParams[voice].sweep = input.sweep;
      tweaks.push(`sweep=${input.sweep}`);
    }

    // Snappy: 0-100 (snare only)
    if (input.snappy !== undefined) {
      session.drumParams[voice].snappy = input.snappy;
      tweaks.push(`snappy=${input.snappy}`);
    }

    // Per-voice engine selection (no conversion needed)
    if (input.engine !== undefined) {
      session.drumVoiceEngines[voice] = input.engine;
      tweaks.push(`engine=${input.engine}`);
    }

    // Sample mode (ch, oh, crash, ride only)
    if (input.useSample !== undefined) {
      const sampleCapable = ['ch', 'oh', 'crash', 'ride'];
      if (sampleCapable.includes(voice)) {
        session.drumUseSample[voice] = input.useSample;
        tweaks.push(`useSample=${input.useSample}`);
      }
    }

    return `R9D9 ${voice}: ${tweaks.join(', ')}`;
  }

  // R9D9 - Set drum groove (flam, pattern length, scale, global accent)
  if (name === "set_drum_groove") {
    const changes = [];
    if (input.flam !== undefined) {
      session.drumFlam = Math.max(0, Math.min(1, input.flam));
      changes.push(`flam=${session.drumFlam}`);
    }
    if (input.patternLength !== undefined) {
      session.drumPatternLength = Math.max(1, Math.min(16, Math.floor(input.patternLength)));
      changes.push(`patternLength=${session.drumPatternLength}`);
    }
    if (input.scale !== undefined) {
      const validScales = ['16th', '8th-triplet', '16th-triplet', '32nd'];
      if (validScales.includes(input.scale)) {
        session.drumScale = input.scale;
        changes.push(`scale=${session.drumScale}`);
      }
    }
    if (input.globalAccent !== undefined) {
      session.drumGlobalAccent = Math.max(0, Math.min(1, input.globalAccent));
      changes.push(`globalAccent=${session.drumGlobalAccent}`);
    }
    return `R9D9 groove: ${changes.join(', ') || 'no changes'}`;
  }

  // R9D9 - Automate drums (knob mashing)
  if (name === "automate_drums") {
    const { voice, param, values } = input;

    // Initialize automation structure if needed
    if (!session.drumAutomation[voice]) {
      session.drumAutomation[voice] = {};
    }

    // Store the 16-step automation values (pad with null if needed)
    const automationValues = Array(16).fill(null).map((_, i) =>
      values[i] !== undefined ? values[i] : null
    );
    session.drumAutomation[voice][param] = automationValues;

    const activeSteps = automationValues.filter(v => v !== null).length;
    return `R9D9 ${voice} ${param} automation: ${activeSteps}/16 steps`;
  }

  // R9D9 - Clear automation
  if (name === "clear_automation") {
    const { voice, param } = input;

    if (!voice) {
      // Clear ALL automation
      session.drumAutomation = {};
      return `Cleared all drum automation`;
    }

    if (!session.drumAutomation[voice]) {
      return `No automation on ${voice} to clear`;
    }

    if (!param) {
      // Clear all params for this voice
      delete session.drumAutomation[voice];
      return `Cleared all automation on ${voice}`;
    }

    // Clear specific param
    delete session.drumAutomation[voice][param];
    // Clean up empty voice object
    if (Object.keys(session.drumAutomation[voice]).length === 0) {
      delete session.drumAutomation[voice];
    }
    return `Cleared ${voice} ${param} automation`;
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
  // Accepts producer units: dB for level, Hz for cutoff, 0-100 for resonance/envMod/decay/accent
  if (name === "tweak_bass") {
    const tweaks = [];

    // Mute: convenience alias for level=-60dB (silent)
    if (input.mute === true) {
      const def = getParamDef('r3d3', 'bass', 'level');
      session.bassParams.level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    }

    // Waveform (choice, no conversion)
    if (input.waveform !== undefined) {
      session.bassParams.waveform = input.waveform;
      tweaks.push(`waveform=${input.waveform}`);
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'level');
      session.bassParams.level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Cutoff: Hz → 0-1 (log scale)
    if (input.cutoff !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'cutoff');
      session.bassParams.cutoff = def ? toEngine(input.cutoff, def) : input.cutoff;
      const display = input.cutoff >= 1000 ? `${(input.cutoff/1000).toFixed(1)}kHz` : `${input.cutoff}Hz`;
      tweaks.push(`cutoff=${display}`);
    }

    // Resonance: 0-100 → 0-1
    if (input.resonance !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'resonance');
      session.bassParams.resonance = def ? toEngine(input.resonance, def) : input.resonance / 100;
      tweaks.push(`resonance=${input.resonance}`);
    }

    // EnvMod: 0-100 → 0-1
    if (input.envMod !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'envMod');
      session.bassParams.envMod = def ? toEngine(input.envMod, def) : input.envMod / 100;
      tweaks.push(`envMod=${input.envMod}`);
    }

    // Decay: 0-100 → 0-1
    if (input.decay !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'decay');
      session.bassParams.decay = def ? toEngine(input.decay, def) : input.decay / 100;
      tweaks.push(`decay=${input.decay}`);
    }

    // Accent: 0-100 → 0-1
    if (input.accent !== undefined) {
      const def = getParamDef('r3d3', 'bass', 'accent');
      session.bassParams.accent = def ? toEngine(input.accent, def) : input.accent / 100;
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
  // Accepts producer units: dB for level, Hz for cutoff, semitones for lfoToPitch, 0-100 for most others
  if (name === "tweak_lead") {
    const tweaks = [];

    // Mute: convenience alias for level=-60dB (silent)
    if (input.mute === true) {
      const def = getParamDef('r1d1', 'lead', 'level');
      session.leadParams.level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('r1d1', 'lead', 'level');
      session.leadParams.level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Cutoff: Hz → 0-1 (log scale)
    if (input.cutoff !== undefined) {
      const def = getParamDef('r1d1', 'lead', 'cutoff');
      session.leadParams.cutoff = def ? toEngine(input.cutoff, def) : input.cutoff;
      const display = input.cutoff >= 1000 ? `${(input.cutoff/1000).toFixed(1)}kHz` : `${input.cutoff}Hz`;
      tweaks.push(`cutoff=${display}`);
    }

    // LFO to pitch: semitones (keep as semitones for engine, it handles it)
    if (input.lfoToPitch !== undefined) {
      // SH-101 engine expects 0-1 for lfoToPitch where 1 = max modulation
      // We'll convert semitones to 0-1 range (0-24 semitones → 0-1)
      const def = getParamDef('r1d1', 'lead', 'lfoToPitch');
      session.leadParams.lfoToPitch = def ? input.lfoToPitch / def.max : input.lfoToPitch / 24;
      tweaks.push(`lfoToPitch=${input.lfoToPitch}st`);
    }

    // All other 0-100 params
    const knobParams = [
      'vcoSaw', 'vcoPulse', 'pulseWidth',
      'subLevel', 'resonance', 'envMod',
      'attack', 'decay', 'sustain', 'release',
      'lfoRate', 'lfoToFilter', 'lfoToPW'
    ];
    for (const param of knobParams) {
      if (input[param] !== undefined) {
        const def = getParamDef('r1d1', 'lead', param);
        session.leadParams[param] = def ? toEngine(input[param], def) : input[param] / 100;
        tweaks.push(`${param}=${input[param]}`);
      }
    }

    // Choice params (no conversion)
    if (input.subMode !== undefined) {
      session.leadParams.subMode = input.subMode;
      tweaks.push(`subMode=${input.subMode}`);
    }
    if (input.lfoWaveform !== undefined) {
      session.leadParams.lfoWaveform = input.lfoWaveform;
      tweaks.push(`lfoWaveform=${input.lfoWaveform}`);
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

  // List all projects
  if (name === "list_projects") {
    const projects = listProjects();
    if (projects.length === 0) {
      return "No projects found. Create a beat and render to start a project.";
    }
    const projectList = projects.map(p => {
      const date = new Date(p.modified).toLocaleDateString();
      return `  ${p.folderName} - "${p.name}" (${p.bpm} BPM, ${p.renderCount} renders, ${date})`;
    }).join('\n');
    return `Your projects:\n${projectList}\n\nUse open_project to continue working on one.`;
  }

  // Open an existing project
  if (name === "open_project") {
    if (!context.onOpenProject) {
      return "Cannot open projects in this context.";
    }
    const projects = listProjects();
    const searchTerm = input.name.toLowerCase();
    const found = projects.find(p =>
      p.folderName.toLowerCase().includes(searchTerm) ||
      p.name.toLowerCase().includes(searchTerm)
    );
    if (!found) {
      const available = projects.slice(0, 5).map(p => p.folderName).join(', ');
      return `Project not found: "${input.name}". Recent projects: ${available}`;
    }
    const result = context.onOpenProject(found.folderName);
    if (result.error) {
      return result.error;
    }
    return `Opened project "${result.name}" (${result.bpm} BPM, ${result.renderCount} renders). Session restored.`;
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
            level: 0.5,  // 0dB unity gain (normalized: 0.5 = 0dB, 1.0 = +6dB)
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
          added.push(`${slot}:${steps.length}`);
        } else {
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.samplerPattern[slot][step].velocity = 1;
            }
          }
          added.push(`${slot}:${steps.length}`);
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
  // Accepts producer units: dB for level, semitones for tune, 0-100 for attack/decay, Hz for filter, pan -100 to +100
  if (name === "tweak_samples") {
    const slot = input.slot;
    if (!session.samplerParams[slot]) {
      session.samplerParams[slot] = { level: 0.5, tune: 0, attack: 0, decay: 1, filter: 1, pan: 0 };  // 0.5 = 0dB unity
    }

    const tweaks = [];

    // Mute: convenience alias for level=-60dB (silent)
    if (input.mute === true) {
      const def = getParamDef('r9ds', slot, 'level');
      session.samplerParams[slot].level = def ? toEngine(-60, def) : 0;
      tweaks.push('muted');
    }

    // Level: dB → linear
    if (input.level !== undefined) {
      const def = getParamDef('r9ds', slot, 'level');
      session.samplerParams[slot].level = def ? toEngine(input.level, def) : input.level;
      tweaks.push(`level=${input.level}dB`);
    }

    // Tune: semitones (sampler might want semitones directly)
    if (input.tune !== undefined) {
      // Keep as semitones for sampler engine
      session.samplerParams[slot].tune = input.tune;
      tweaks.push(`tune=${input.tune > 0 ? '+' : ''}${input.tune}st`);
    }

    // Attack: 0-100 → 0-1
    if (input.attack !== undefined) {
      const def = getParamDef('r9ds', slot, 'attack');
      session.samplerParams[slot].attack = def ? toEngine(input.attack, def) : input.attack / 100;
      tweaks.push(`attack=${input.attack}`);
    }

    // Decay: 0-100 → 0-1
    if (input.decay !== undefined) {
      const def = getParamDef('r9ds', slot, 'decay');
      session.samplerParams[slot].decay = def ? toEngine(input.decay, def) : input.decay / 100;
      tweaks.push(`decay=${input.decay}`);
    }

    // Filter: Hz → 0-1 (log scale)
    if (input.filter !== undefined) {
      const def = getParamDef('r9ds', slot, 'filter');
      session.samplerParams[slot].filter = def ? toEngine(input.filter, def) : input.filter;
      const display = input.filter >= 1000 ? `${(input.filter/1000).toFixed(1)}kHz` : `${input.filter}Hz`;
      tweaks.push(`filter=${display}`);
    }

    // Pan: -100 to +100 → -1 to +1
    if (input.pan !== undefined) {
      const def = getParamDef('r9ds', slot, 'pan');
      session.samplerParams[slot].pan = def ? toEngine(input.pan, def) : input.pan / 100;
      const panDisplay = input.pan === 0 ? 'C' : (input.pan < 0 ? `L${Math.abs(input.pan)}` : `R${input.pan}`);
      tweaks.push(`pan=${panDisplay}`);
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
        level: 0.5,  // 0dB unity gain (normalized: 0.5 = 0dB, 1.0 = +6dB)
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

  // === MIXER TOOLS ===

  // Create send bus
  if (name === "create_send") {
    const { name: busName, effect } = input;

    // Ensure mixer state exists
    if (!session.mixer) {
      session.mixer = { sends: {}, voiceRouting: {}, channelInserts: {}, masterInserts: [], masterVolume: 0.8 };
    }

    if (session.mixer.sends[busName]) {
      return `Send bus "${busName}" already exists. Use route_to_send to add sources or tweak_reverb to adjust.`;
    }

    // Store all reverb parameters
    const params = {
      decay: input.decay,
      damping: input.damping,
      predelay: input.predelay,
      modulation: input.modulation,
      lowcut: input.lowcut,
      highcut: input.highcut,
      width: input.width,
      mix: input.mix ?? 0.3
    };

    // Remove undefined values (will use defaults in generatePlateReverbIR)
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    session.mixer.sends[busName] = { effect, params };

    const paramList = Object.entries(params)
      .filter(([k, v]) => k !== 'mix' && v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');

    return `Created send bus "${busName}" with plate reverb${paramList ? ` (${paramList})` : ''}. Use route_to_send to send voices to it.`;
  }

  // Tweak reverb parameters on existing send
  if (name === "tweak_reverb") {
    const { send: busName } = input;

    if (!session.mixer?.sends?.[busName]) {
      return `Error: Send bus "${busName}" doesn't exist. Use create_send first.`;
    }

    if (session.mixer.sends[busName].effect !== 'reverb') {
      return `Error: "${busName}" is not a reverb bus.`;
    }

    const params = session.mixer.sends[busName].params || {};
    const tweaks = [];

    ['decay', 'damping', 'predelay', 'modulation', 'lowcut', 'highcut', 'width', 'mix'].forEach(p => {
      if (input[p] !== undefined) {
        params[p] = input[p];
        tweaks.push(`${p}=${input[p]}`);
      }
    });

    session.mixer.sends[busName].params = params;

    return `Tweaked reverb "${busName}": ${tweaks.join(', ')}`;
  }

  // Route voice to send
  if (name === "route_to_send") {
    const { voice, send, level } = input;

    if (!session.mixer?.sends?.[send]) {
      return `Error: Send bus "${send}" doesn't exist. Use create_send first.`;
    }

    if (!session.mixer.voiceRouting) session.mixer.voiceRouting = {};
    if (!session.mixer.voiceRouting[voice]) {
      session.mixer.voiceRouting[voice] = { sends: {}, inserts: [] };
    }

    session.mixer.voiceRouting[voice].sends[send] = level ?? 0.3;

    return `Routing ${voice} → ${send} at ${((level ?? 0.3) * 100).toFixed(0)}% level`;
  }

  // Add channel insert (replaces existing insert of same type)
  if (name === "add_channel_insert") {
    const { channel, effect, preset, params } = input;

    if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
    if (!session.mixer.channelInserts[channel]) session.mixer.channelInserts[channel] = [];

    // Remove existing insert of the same type (replace, don't duplicate)
    session.mixer.channelInserts[channel] = session.mixer.channelInserts[channel].filter(i => i.type !== effect);

    session.mixer.channelInserts[channel].push({
      type: effect,
      preset,
      params: params || {}
    });

    return `Added ${effect}${preset ? ` (${preset})` : ''} insert to ${channel} channel`;
  }

  // Remove channel insert
  if (name === "remove_channel_insert") {
    const { channel, effect } = input;

    if (!session.mixer.channelInserts?.[channel]) {
      return `No inserts on ${channel} channel`;
    }

    if (effect === 'all' || !effect) {
      // Remove all inserts for this channel
      const count = session.mixer.channelInserts[channel].length;
      delete session.mixer.channelInserts[channel];
      return `Removed all ${count} insert(s) from ${channel} channel`;
    } else {
      // Remove specific effect type
      const before = session.mixer.channelInserts[channel].length;
      session.mixer.channelInserts[channel] = session.mixer.channelInserts[channel].filter(i => i.type !== effect);
      const removed = before - session.mixer.channelInserts[channel].length;
      if (removed === 0) {
        return `No ${effect} insert found on ${channel} channel`;
      }
      return `Removed ${effect} insert from ${channel} channel`;
    }
  }

  // Add sidechain
  if (name === "add_sidechain") {
    const { target, trigger, amount } = input;

    if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
    if (!session.mixer.channelInserts[target]) session.mixer.channelInserts[target] = [];

    session.mixer.channelInserts[target].push({
      type: 'ducker',
      params: {
        trigger,
        amount: amount ?? 0.5
      }
    });

    return `Added sidechain: ${target} ducks when ${trigger} plays (${((amount ?? 0.5) * 100).toFixed(0)}% reduction)`;
  }

  // Add master insert
  if (name === "add_master_insert") {
    const { effect, preset, params } = input;

    if (!session.mixer.masterInserts) session.mixer.masterInserts = [];

    session.mixer.masterInserts.push({
      type: effect,
      preset,
      params: params || {}
    });

    return `Added ${effect}${preset ? ` (${preset})` : ''} to master bus`;
  }

  // Analyze render
  if (name === "analyze_render") {
    const { filename } = input;
    const wavPath = filename || context.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to analyze. Render first, or provide a filename.';
    }

    // Import analyze module
    try {
      const { analyzeWav, formatAnalysis, getRecommendations } = await import('./analyze.js');
      const analysis = await analyzeWav(wavPath, { bpm: session.bpm });
      const formatted = formatAnalysis(analysis);
      const recommendations = getRecommendations(analysis);

      return `${formatted}\n\nRECOMMENDATIONS:\n${recommendations.map(r => `• ${r}`).join('\n')}`;
    } catch (e) {
      return `Analysis error: ${e.message}`;
    }
  }

  // Show mixer
  if (name === "show_mixer") {
    if (!session.mixer || (
      Object.keys(session.mixer.sends || {}).length === 0 &&
      Object.keys(session.mixer.voiceRouting || {}).length === 0 &&
      Object.keys(session.mixer.channelInserts || {}).length === 0 &&
      (session.mixer.masterInserts || []).length === 0
    )) {
      return 'Mixer is empty. Use create_send, route_to_send, add_channel_insert, or add_sidechain to configure.';
    }

    const lines = ['MIXER CONFIGURATION:', ''];

    // Sends
    const sends = Object.entries(session.mixer.sends || {});
    if (sends.length > 0) {
      lines.push('SEND BUSES:');
      sends.forEach(([name, config]) => {
        lines.push(`  ${name}: ${config.effect}${config.params?.preset ? ` (${config.params.preset})` : ''}`);
      });
      lines.push('');
    }

    // Voice routing
    const routing = Object.entries(session.mixer.voiceRouting || {});
    if (routing.length > 0) {
      lines.push('VOICE ROUTING:');
      routing.forEach(([voice, config]) => {
        const sendInfo = Object.entries(config.sends || {})
          .map(([bus, level]) => `${bus} @ ${(level * 100).toFixed(0)}%`)
          .join(', ');
        if (sendInfo) lines.push(`  ${voice} → ${sendInfo}`);
      });
      lines.push('');
    }

    // Channel inserts
    const inserts = Object.entries(session.mixer.channelInserts || {});
    if (inserts.length > 0) {
      lines.push('CHANNEL INSERTS:');
      inserts.forEach(([channel, effects]) => {
        const effectList = effects.map(e => e.type + (e.preset ? ` (${e.preset})` : '')).join(' → ');
        lines.push(`  ${channel}: ${effectList}`);
      });
      lines.push('');
    }

    // Master inserts
    if ((session.mixer.masterInserts || []).length > 0) {
      const masterEffects = session.mixer.masterInserts.map(e => e.type + (e.preset ? ` (${e.preset})` : '')).join(' → ');
      lines.push('MASTER BUS:');
      lines.push(`  ${masterEffects}`);
    }

    return lines.join('\n');
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

  // === ARRANGEMENT MODE ===
  // If arrangement is set, calculate total bars from sections and build a render plan
  const hasArrangement = session.arrangement && session.arrangement.length > 0;
  let renderBars = bars;
  let arrangementPlan = null;  // { barStart, barEnd, patterns } for each section

  if (hasArrangement) {
    // Build the render plan
    arrangementPlan = [];
    let currentBar = 0;
    for (const section of session.arrangement) {
      arrangementPlan.push({
        barStart: currentBar,
        barEnd: currentBar + section.bars,
        patterns: section.patterns
      });
      currentBar += section.bars;
    }
    renderBars = currentBar;
  }

  // Collect ALL channel inserts from ALL patterns (for arrangement mode)
  // This lets us create filter nodes that can be enabled/disabled per-section
  const allPatternInserts = new Map(); // channel -> array of insert configs from any pattern
  if (hasArrangement) {
    const instruments = ['drums', 'bass', 'lead', 'sampler'];
    for (const inst of instruments) {
      for (const [patternName, patternData] of Object.entries(session.patterns[inst] || {})) {
        if (patternData.channelInserts) {
          for (const [channel, inserts] of Object.entries(patternData.channelInserts)) {
            if (!allPatternInserts.has(channel)) {
              allPatternInserts.set(channel, inserts);
            }
            // Just keep first one found - we'll reconfigure at section boundaries
          }
        }
      }
    }
  }

  // Helper: get pattern data for a specific instrument at a given bar
  const getPatternForBar = (instrument, bar) => {
    if (!hasArrangement) {
      // Use current working pattern
      if (instrument === 'drums') return { pattern: session.drumPattern, params: session.drumParams, automation: session.drumAutomation, length: session.drumPatternLength };
      if (instrument === 'bass') return { pattern: session.bassPattern, params: session.bassParams };
      if (instrument === 'lead') return { pattern: session.leadPattern, params: session.leadParams };
      if (instrument === 'sampler') return { pattern: session.samplerPattern, params: session.samplerParams };
      return null;
    }

    // Find which section this bar is in
    const section = arrangementPlan.find(s => bar >= s.barStart && bar < s.barEnd);
    if (!section) return null;

    const patternName = section.patterns[instrument];
    if (!patternName) return null;  // Instrument silenced in this section

    const savedPattern = session.patterns[instrument]?.[patternName];
    if (!savedPattern) return null;

    return savedPattern;
  };

  const stepsPerBar = 16;
  const totalSteps = renderBars * stepsPerBar;
  const stepDuration = 60 / session.bpm / 4;  // Standard 16th note duration

  // Drum-specific step duration based on scale mode
  const drumScaleMultipliers = {
    '16th': 1,           // Standard 16th notes
    '8th-triplet': 4/3,  // 8th triplets (slower, 12 per bar)
    '16th-triplet': 2/3, // 16th triplets (faster, 24 per bar)
    '32nd': 0.5          // 32nd notes (double speed)
  };
  const drumStepDuration = stepDuration * (drumScaleMultipliers[session.drumScale] || 1);
  const drumPatternLength = session.drumPatternLength || 16;

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

  // Create per-instrument output gain nodes (for node-level mixing)
  const drumsGain = context.createGain();
  const drumsLevel = session.get('drums.level') ?? 0;  // dB, default 0 = unity
  drumsGain.gain.value = Math.pow(10, drumsLevel / 20);
  drumsGain.connect(masterGain);

  const bassGain = context.createGain();
  const bassLevel = session.get('bass.level') ?? 0;  // dB, default 0 = unity
  bassGain.gain.value = Math.pow(10, bassLevel / 20);
  bassGain.connect(masterGain);

  const leadGain = context.createGain();
  const leadLevel = session.get('lead.level') ?? 0;  // dB, default 0 = unity
  leadGain.gain.value = Math.pow(10, leadLevel / 20);
  leadGain.connect(masterGain);

  const samplerGain = context.createGain();
  const samplerLevel = session.get('sampler.level') ?? 0;  // dB, default 0 = unity
  samplerGain.gain.value = Math.pow(10, samplerLevel / 20);
  samplerGain.connect(masterGain);

  // === R9D9 (Drums) ===
  // Get kit - EXACTLY like web app's loadKit()
  const drumKit = TR909_KITS.find(k => k.id === session.drumKit) || TR909_KITS[0];
  const drums = new TR909Engine({ context });
  drums.connectOutput(drumsGain);  // Route through node gain

  // Step 1: Reset all per-voice engines to defaults (like web app)
  if (drums.resetAllVoiceEngines) {
    drums.resetAllVoiceEngines();
  }

  // Step 2-3: Force engine change (like web app)
  if (drumKit.engine && drums.setEngine) {
    drums.currentEngine = null; // Force re-init
    drums.setEngine(drumKit.engine);
  }

  // Step 4: Reset ALL voice params to defaults (like web app)
  const voiceNames = ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'];
  if (drums.getVoiceParameterDescriptors) {
    const descriptors = drums.getVoiceParameterDescriptors();
    Object.entries(descriptors).forEach(([voiceId, params]) => {
      params.forEach((param) => {
        try {
          drums.setVoiceParam(voiceId, param.id, param.defaultValue);
        } catch (e) {
          // Ignore - param may not exist on current engine
        }
      });
    });
  }

  // Step 5: Apply drum params (kit defaults + user tweaks, stored in producer units)
  // Only apply session.drumParams in single-pattern mode.
  // In arrangement mode, per-pattern params are applied during the render loop.
  if (!hasArrangement) {
    for (const voiceId of voiceNames) {
      const producerParams = session.drumParams[voiceId];
      if (producerParams && Object.keys(producerParams).length > 0) {
        // Convert producer units to engine units
        const engineParams = convertTweaks('r9d9', voiceId, producerParams);
        Object.entries(engineParams).forEach(([paramId, value]) => {
          try {
            drums.setVoiceParam(voiceId, paramId, value);
          } catch (e) {
            // Ignore - param may not exist on current engine
          }
        });
      }
    }
  }

  // Step 7: Apply per-voice engine selection
  if (session.drumVoiceEngines && drums.setVoiceEngine) {
    Object.entries(session.drumVoiceEngines).forEach(([voiceId, engine]) => {
      try {
        drums.setVoiceEngine(voiceId, engine);
      } catch (e) {
        // Ignore
      }
    });
  }

  // Step 8: Apply sample mode for hats/cymbals
  if (session.drumUseSample) {
    const sampleCapable = ['ch', 'oh', 'crash', 'ride'];
    sampleCapable.forEach(voiceId => {
      if (session.drumUseSample[voiceId] !== undefined) {
        const voice = drums.voices.get(voiceId);
        if (voice && voice.setUseSample) {
          voice.setUseSample(session.drumUseSample[voiceId]);
        }
      }
    });
  }

  // Step 9: Apply flam (globalAccent is applied during manual triggering below)
  if (session.drumFlam > 0 && drums.setFlam) {
    drums.setFlam(session.drumFlam);
  }

  // === R3D3 (Bass) ===
  const bass = new TB303Engine({ context, engine: 'E1' });
  bass.connectOutput(bassGain);  // Route through node gain
  const bassVoice = bass.voices.get('bass');
  // Apply bass params
  if (session.bassParams.waveform) {
    bass.setWaveform(session.bassParams.waveform);
  }
  Object.entries(session.bassParams).forEach(([key, value]) => {
    if (key !== 'waveform') {
      bass.setParameter(key, value);
    }
  });

  // === R1D1 (Lead) ===
  // For arrangement mode, pre-render each unique lead pattern and store with section offsets
  // For single-pattern mode, pre-render once
  const leadBuffers = [];  // { buffer, startBar, bars }

  if (hasArrangement) {
    // Collect unique lead patterns with their section info
    const leadSections = [];
    for (const section of arrangementPlan) {
      const patternName = section.patterns.lead;
      if (patternName && session.patterns.lead?.[patternName]) {
        leadSections.push({
          patternName,
          patternData: session.patterns.lead[patternName],
          startBar: section.barStart,
          bars: section.barEnd - section.barStart
        });
      }
    }

    // Pre-render each lead section
    for (const sec of leadSections) {
      const leadInitContext = new OfflineAudioContext(2, 44100, 44100);
      const lead = new SH101Engine({ context: leadInitContext, engine: 'E1' });

      // Apply params
      Object.entries(sec.patternData.params || {}).forEach(([key, value]) => {
        const paramKey = key === 'level' ? 'volume' : key;
        lead.setParameter(paramKey, value);
      });
      lead.setPattern(sec.patternData.pattern);

      if (sec.patternData.pattern?.some(s => s.gate)) {
        const buffer = await lead.renderPattern({ bars: sec.bars, bpm: session.bpm });
        leadBuffers.push({ buffer, startBar: sec.startBar, bars: sec.bars });
      }
    }
  } else {
    // Single pattern mode - original behavior
    const leadInitContext = new OfflineAudioContext(2, 44100, 44100);
    const lead = new SH101Engine({ context: leadInitContext, engine: 'E1' });
    Object.entries(session.leadParams).forEach(([key, value]) => {
      const paramKey = key === 'level' ? 'volume' : key;
      lead.setParameter(paramKey, value);
    });
    lead.setPattern(session.leadPattern);

    if (session.leadPattern.some(s => s.gate)) {
      const buffer = await lead.renderPattern({ bars: renderBars, bpm: session.bpm });
      leadBuffers.push({ buffer, startBar: 0, bars: renderBars });
    }
  }

  // === R9DS (Sampler) ===
  const samplerVoices = new Map();
  if (session.samplerKit) {
    for (const slot of session.samplerKit.slots) {
      if (slot.buffer) {
        const voice = new SampleVoice(slot.id, context);
        // Decode the buffer (it's raw WAV bytes, need to convert to AudioBuffer)
        try {
          // Convert Node.js Buffer to ArrayBuffer for decodeAudioData
          const arrayBuffer = slot.buffer.buffer.slice(
            slot.buffer.byteOffset,
            slot.buffer.byteOffset + slot.buffer.byteLength
          );
          const audioBuffer = await context.decodeAudioData(arrayBuffer);
          voice.setBuffer(audioBuffer);
          voice.setMeta(slot.name, slot.short);
          // Apply params
          const params = session.samplerParams[slot.id];
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              voice.setParameter(key, value);
            });
          }
          voice.connect(samplerGain);  // Route through node gain
          samplerVoices.set(slot.id, voice);
        } catch (e) {
          console.warn(`Could not decode sample for ${slot.id}:`, e.message);
        }
      }
    }
  }

  // === APPLY MIXER CONFIGURATION ===
  const mixerConfig = session.mixer || {};
  const sendBuses = new Map();  // name -> { input, effect, output }
  const sidechainTargets = new Map(); // target -> { gain, trigger, amount }

  // EQ presets
  const EQ_PRESETS = {
    acidBass: { highpass: 60, lowGain: 2, midGain: 3, midFreq: 800, highGain: -2 },
    crispHats: { highpass: 200, lowGain: -3, midGain: 0, midFreq: 3000, highGain: 2 },
    warmPad: { highpass: 80, lowGain: 2, midGain: -1, midFreq: 500, highGain: -3 },
    master: { highpass: 30, lowGain: 0, midGain: 0, midFreq: 1000, highGain: 1 },
    punchyKick: { highpass: 30, lowGain: 3, midGain: -2, midFreq: 400, highGain: 0 },
    cleanSnare: { highpass: 100, lowGain: -2, midGain: 2, midFreq: 2000, highGain: 1 },
  };

  // Filter presets (mode: lowpass/highpass/bandpass, cutoff in Hz, resonance 0-100)
  const FILTER_PRESETS = {
    dubDelay: { mode: 'lowpass', cutoff: 800, resonance: 30 },      // Classic dub lowpass
    telephone: { mode: 'bandpass', cutoff: 1500, resonance: 50 },   // Telephone/radio effect
    lofi: { mode: 'lowpass', cutoff: 3000, resonance: 10 },         // Lo-fi tape warmth
    darkRoom: { mode: 'lowpass', cutoff: 400, resonance: 40 },      // Dark, muffled
    airFilter: { mode: 'highpass', cutoff: 500, resonance: 20 },    // Remove low rumble with character
    thinOut: { mode: 'highpass', cutoff: 1000, resonance: 30 },     // Thin, distant sound
  };

  // Helper: Create 3-band EQ chain
  function createEQ(ctx, params = {}) {
    const p = params.preset ? { ...EQ_PRESETS[params.preset], ...params } : params;

    const input = ctx.createGain();
    const output = ctx.createGain();

    // Highpass filter
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = p.highpass || 20;
    hpf.Q.value = 0.7;

    // Low shelf
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 200;
    lowShelf.gain.value = p.lowGain || 0;

    // Mid peak
    const midPeak = ctx.createBiquadFilter();
    midPeak.type = 'peaking';
    midPeak.frequency.value = p.midFreq || 1000;
    midPeak.Q.value = 1.5;
    midPeak.gain.value = p.midGain || 0;

    // High shelf
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 6000;
    highShelf.gain.value = p.highGain || 0;

    // Chain: input → HPF → lowShelf → midPeak → highShelf → output
    input.connect(hpf);
    hpf.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(output);

    return { input, output };
  }

  // Helper: Create resonant filter (lowpass/highpass/bandpass)
  function createFilter(ctx, params = {}) {
    const p = params.preset ? { ...FILTER_PRESETS[params.preset], ...params } : params;

    const input = ctx.createGain();
    const output = ctx.createGain();

    const filter = ctx.createBiquadFilter();
    filter.type = p.mode || 'lowpass';
    filter.frequency.value = p.cutoff || 1000;
    // Convert resonance 0-100 to Q (0.5 to 20)
    const resonance = p.resonance ?? 0;
    filter.Q.value = 0.5 + (resonance / 100) * 19.5;

    input.connect(filter);
    filter.connect(output);

    return { input, output, filterNode: filter };
  }

  // Create send buses (reverb or EQ)
  if (mixerConfig.sends) {
    for (const [busName, busConfig] of Object.entries(mixerConfig.sends)) {
      const sendInput = context.createGain();
      sendInput.gain.value = 1;
      let effectOutput = sendInput;

      if (busConfig.effect === 'reverb') {
        // Plate reverb using Dattorro-style algorithm
        const convolver = context.createConvolver();
        const reverbParams = busConfig.params || {};
        const reverbBuffer = generatePlateReverbIR(context, reverbParams);
        convolver.buffer = reverbBuffer;
        sendInput.connect(convolver);

        const wetGain = context.createGain();
        wetGain.gain.value = reverbParams.mix ?? 0.3;
        convolver.connect(wetGain);
        effectOutput = wetGain;

      } else if (busConfig.effect === 'eq') {
        // EQ send bus
        const eq = createEQ(context, busConfig.params || {});
        sendInput.connect(eq.input);
        effectOutput = eq.output;
      }

      effectOutput.connect(masterGain);
      sendBuses.set(busName, { input: sendInput, output: effectOutput });
    }
  }

  // Route voices to sends
  if (mixerConfig.voiceRouting) {
    for (const [voiceId, routeConfig] of Object.entries(mixerConfig.voiceRouting)) {
      let voiceOutput = null;

      // Drum voices
      if (['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'].includes(voiceId)) {
        voiceOutput = drums.voices.get(voiceId)?.output;
      } else if (voiceId === 'bass') {
        voiceOutput = bassVoice?.output;
      } else if (voiceId.startsWith('s') && samplerVoices.has(voiceId)) {
        voiceOutput = samplerVoices.get(voiceId)?.output;
      }

      if (voiceOutput && routeConfig.sends) {
        for (const [busName, level] of Object.entries(routeConfig.sends)) {
          const bus = sendBuses.get(busName);
          if (bus) {
            const sendGain = context.createGain();
            sendGain.gain.value = level;
            voiceOutput.connect(sendGain);
            sendGain.connect(bus.input);
          }
        }
      }
    }
  }

  // Channel inserts (EQ, filter, ducker) - track which channels have been rerouted
  const channelOutputs = new Map(); // channel -> final output node
  const channelFilters = new Map(); // channel -> { filter: BiquadFilterNode, type: 'eq'|'filter' } for reconfiguring

  // Merge current mixer config with all pattern inserts (for arrangement mode)
  const allChannelInserts = { ...(mixerConfig.channelInserts || {}) };
  if (hasArrangement) {
    for (const [channel, inserts] of allPatternInserts) {
      if (!allChannelInserts[channel]) {
        allChannelInserts[channel] = inserts;
      }
    }
  }

  // Track which drum voices have individual inserts (so we don't double-connect them)
  const voicesWithInserts = new Set();

  if (Object.keys(allChannelInserts).length > 0) {
    for (const [channel, inserts] of Object.entries(allChannelInserts)) {
      // Get the channel's source output
      let sourceOutput = null;
      let destinationNode = masterGain; // Default destination

      if (channel === 'bass' && bass.masterGain) {
        sourceOutput = bass.masterGain;
      } else if (channel === 'drums' && drums.compressor) {
        sourceOutput = drums.compressor;
      } else if (['kick', 'snare', 'clap', 'rimshot', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'crash', 'ride'].includes(channel)) {
        // Individual drum voice - insert filter on voice output
        // Note: filtered voices route to master (bypass drum compressor) since we can't insert into internal bus
        const voice = drums.voices.get(channel);
        if (voice?.output) {
          sourceOutput = voice.output;
          destinationNode = masterGain; // Route to master (bypasses drum compressor)
          voicesWithInserts.add(channel);
        }
      }

      if (!sourceOutput) continue;

      // Disconnect from current destination
      try { sourceOutput.disconnect(); } catch (e) { /* already disconnected */ }

      // Build insert chain
      let chainInput = sourceOutput;
      let chainOutput = null;

      for (const insert of inserts) {
        if (insert.type === 'eq') {
          const eqParams = { ...insert.params, preset: insert.preset };
          const eq = createEQ(context, eqParams);
          chainInput.connect(eq.input);
          chainInput = eq.output;
          chainOutput = eq.output;
          // Store for reconfiguration (EQ has multiple filters, store the high shelf)
          channelFilters.set(channel, { type: 'eq', eq });

        } else if (insert.type === 'filter') {
          const filterParams = { ...insert.params, preset: insert.preset };
          const filter = createFilter(context, filterParams);
          chainInput.connect(filter.input);
          chainInput = filter.output;
          chainOutput = filter.output;
          // Store the raw BiquadFilter for reconfiguration
          channelFilters.set(channel, { type: 'filter', filter: filter.filterNode });

        } else if (insert.type === 'ducker' && insert.params?.trigger) {
          const duckGain = context.createGain();
          duckGain.gain.value = 1;
          chainInput.connect(duckGain);
          chainInput = duckGain;
          chainOutput = duckGain;

          sidechainTargets.set(channel, {
            gain: duckGain,
            trigger: insert.params.trigger,
            amount: insert.params.amount ?? 0.5
          });
        }
      }

      // Connect chain output to destination (master for channels, drum bus for individual voices)
      if (chainOutput) {
        chainOutput.connect(destinationNode);
        channelOutputs.set(channel, chainOutput);
      } else {
        // No inserts applied, reconnect directly
        sourceOutput.connect(destinationNode);
      }
    }
  }

  // Master inserts (applied to the master bus before destination)
  let finalMaster = masterGain;
  if (mixerConfig.masterInserts && mixerConfig.masterInserts.length > 0) {
    masterGain.disconnect();

    let chainInput = masterGain;
    let chainOutput = masterGain;

    for (const insert of mixerConfig.masterInserts) {
      if (insert.type === 'eq') {
        const eqParams = { ...insert.params, preset: insert.preset };
        const eq = createEQ(context, eqParams);
        chainInput.connect(eq.input);
        chainInput = eq.output;
        chainOutput = eq.output;
      } else if (insert.type === 'filter') {
        const filterParams = { ...insert.params, preset: insert.preset };
        const filter = createFilter(context, filterParams);
        chainInput.connect(filter.input);
        chainInput = filter.output;
        chainOutput = filter.output;
      }
    }

    chainOutput.connect(context.destination);
    finalMaster = chainOutput;
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

  // Track current section to apply params when section changes
  let lastDrumSection = null;
  let lastBassSection = null;
  let lastSamplerSection = null;
  let lastFilterSection = null;

  // Helper: Reconfigure a filter based on pattern's channelInserts (or bypass if none)
  const reconfigureFilter = (channel, patternInserts, atTime) => {
    const filterInfo = channelFilters.get(channel);
    if (!filterInfo || filterInfo.type !== 'filter') return;

    const filterNode = filterInfo.filter;
    if (!filterNode) return;

    // Find filter config in this pattern's inserts
    const inserts = patternInserts?.[channel];
    const filterInsert = inserts?.find(i => i.type === 'filter');

    if (filterInsert) {
      // Apply the filter config
      const p = filterInsert.preset ? { ...FILTER_PRESETS[filterInsert.preset], ...filterInsert.params } : filterInsert.params;
      filterNode.type = p.mode || 'lowpass';
      filterNode.frequency.setValueAtTime(p.cutoff || 1000, atTime);
      const resonance = p.resonance ?? 0;
      filterNode.Q.setValueAtTime(0.5 + (resonance / 100) * 19.5, atTime);
    } else {
      // Bypass: set to neutral (lowpass at 20000Hz passes everything)
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(20000, atTime);
      filterNode.Q.setValueAtTime(0.5, atTime);
    }
  };

  for (let i = 0; i < totalSteps; i++) {
    let time = i * stepDuration;
    const step = i % 16;
    const currentBar = Math.floor(i / 16);

    // Apply swing to off-beats (for bass/sampler)
    if (step % 2 === 1) {
      time += swingAmount * maxSwingDelay;
    }

    // === Channel inserts: reconfigure filters at section boundaries ===
    if (hasArrangement && channelFilters.size > 0) {
      const currentSection = arrangementPlan.find(s => currentBar >= s.barStart && currentBar < s.barEnd);
      if (currentSection !== lastFilterSection) {
        lastFilterSection = currentSection;
        // Get channelInserts from patterns used in this section
        for (const [channel] of channelFilters) {
          // Find which instrument owns this channel
          let patternInserts = null;
          if (channel === 'drums' || ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'].includes(channel)) {
            const drumPatternName = currentSection?.patterns?.drums;
            if (drumPatternName) {
              patternInserts = session.patterns.drums?.[drumPatternName]?.channelInserts;
            }
          } else if (channel === 'bass') {
            const bassPatternName = currentSection?.patterns?.bass;
            if (bassPatternName) {
              patternInserts = session.patterns.bass?.[bassPatternName]?.channelInserts;
            }
          } else if (channel === 'lead') {
            const leadPatternName = currentSection?.patterns?.lead;
            if (leadPatternName) {
              patternInserts = session.patterns.lead?.[leadPatternName]?.channelInserts;
            }
          } else if (channel === 'sampler') {
            const samplerPatternName = currentSection?.patterns?.sampler;
            if (samplerPatternName) {
              patternInserts = session.patterns.sampler?.[samplerPatternName]?.channelInserts;
            }
          }
          reconfigureFilter(channel, patternInserts, time);
        }
      }
    }

    // === R9D9 drums (uses arrangement-aware patterns) ===
    const drumData = getPatternForBar('drums', currentBar);
    if (drumData && drumData.pattern) {
      // Apply pattern params when section changes (for per-pattern level/tune/etc)
      const drumSectionKey = hasArrangement ? arrangementPlan.find(s => currentBar >= s.barStart && currentBar < s.barEnd) : null;
      if (drumSectionKey !== lastDrumSection) {
        lastDrumSection = drumSectionKey;
        // FIRST: Reset ALL voice params to defaults so automation/tweaks don't carry over
        // This ensures pattern B with no automation doesn't inherit pattern A's knob-mashed values
        if (drums.getVoiceParameterDescriptors) {
          const descriptors = drums.getVoiceParameterDescriptors();
          for (const voiceName of voiceNames) {
            const voiceDesc = descriptors[voiceName];
            if (voiceDesc) {
              for (const param of voiceDesc) {
                try {
                  drums.setVoiceParam(voiceName, param.id, param.defaultValue);
                } catch (e) { /* Ignore */ }
              }
            }
          }
        }
        // THEN: Apply this pattern's params (convert from producer to engine units)
        for (const [voiceName, voiceParams] of Object.entries(drumData.params || {})) {
          if (voiceParams && Object.keys(voiceParams).length > 0) {
            const engineParams = convertTweaks('r9d9', voiceName, voiceParams);
            Object.entries(engineParams).forEach(([paramId, value]) => {
              try {
                drums.setVoiceParam(voiceName, paramId, value);
              } catch (e) {
                // Ignore
              }
            });
          }
        }
      }

      const patternLength = drumData.length || 16;
      const drumStep = i % patternLength;  // Wrap based on pattern length
      let drumTime = i * drumStepDuration;
      // Apply swing to drum off-beats
      if (drumStep % 2 === 1) {
        drumTime += swingAmount * (drumStepDuration * 0.5);
      }

      for (const name of voiceNames) {
        if (drumData.pattern[name]?.[drumStep]?.velocity > 0) {
          const voice = drums.voices.get(name);
          if (voice) {
            // Apply automation for this step (knob mashing)
            // Automation values are in producer units (0-100, dB, etc.) - convert to engine units
            const voiceAutomation = drumData.automation?.[name];
            if (voiceAutomation) {
              for (const [paramId, stepValues] of Object.entries(voiceAutomation)) {
                const autoValue = stepValues[drumStep];
                if (autoValue !== null && autoValue !== undefined) {
                  // Convert from producer units to engine units
                  const def = getParamDef('r9d9', name, paramId);
                  const engineValue = def ? toEngine(autoValue, def) : autoValue;
                  voice[paramId] = engineValue;
                }
              }
            }
            voice.trigger(drumTime, drumData.pattern[name][drumStep].velocity);
          }

          // Schedule sidechain ducking if this voice is a trigger
          for (const [targetChannel, scConfig] of sidechainTargets) {
            if (scConfig.trigger === name) {
              const attackTime = 0.005; // 5ms attack
              const releaseTime = 0.15; // 150ms release
              const targetGain = 1 - scConfig.amount;

              scConfig.gain.gain.setValueAtTime(1, drumTime);
              scConfig.gain.gain.linearRampToValueAtTime(targetGain, drumTime + attackTime);
              scConfig.gain.gain.linearRampToValueAtTime(1, drumTime + attackTime + releaseTime);
            }
          }
        }
      }
    }

    // === R3D3 bass (uses arrangement-aware patterns) ===
    const bassData = getPatternForBar('bass', currentBar);
    if (bassData && bassData.pattern) {
      // Apply pattern params when section changes (for per-pattern level/cutoff/etc)
      const bassSectionKey = hasArrangement ? arrangementPlan.find(s => currentBar >= s.barStart && currentBar < s.barEnd) : null;
      if (bassSectionKey !== lastBassSection) {
        lastBassSection = bassSectionKey;
        // FIRST: Reset level to default so mutes don't carry over
        try { bass.setParameter('level', 1); } catch (e) { /* Ignore */ }
        // THEN: Apply this pattern's params to bass
        Object.entries(bassData.params || {}).forEach(([key, value]) => {
          if (key !== 'waveform') {
            bass.setParameter(key, value);
          }
        });
        if (bassData.params?.waveform) {
          bass.setWaveform(bassData.params.waveform);
        }
      }

      const bassStep = bassData.pattern[step];
      if (bassStep?.gate && bassVoice) {
        const freq = noteToFreq(bassStep.note);
        const nextStep = bassData.pattern[(step + 1) % 16];
        const shouldSlide = bassStep.slide && nextStep?.gate;
        const nextFreq = shouldSlide ? noteToFreq(nextStep.note) : null;
        bassVoice.trigger(time, 0.8, freq, bassStep.accent, shouldSlide, nextFreq);
      }
    }

    // R1D1 lead is pre-rendered above using engine.renderPattern()

    // === R9DS sampler (uses arrangement-aware patterns) ===
    const samplerData = getPatternForBar('sampler', currentBar);
    if (samplerData && samplerData.pattern) {
      // Apply pattern params when section changes
      const samplerSectionKey = hasArrangement ? arrangementPlan.find(s => currentBar >= s.barStart && currentBar < s.barEnd) : null;
      if (samplerSectionKey !== lastSamplerSection) {
        lastSamplerSection = samplerSectionKey;
        // FIRST: Reset all sampler voice levels to default so mutes don't carry over
        for (const [slotId, voice] of samplerVoices) {
          try { voice.setParameter('level', 1); } catch (e) { /* Ignore */ }
        }
        // THEN: Apply this pattern's params to sampler voices
        for (const [slotId, slotParams] of Object.entries(samplerData.params || {})) {
          const voice = samplerVoices.get(slotId);
          if (voice) {
            Object.entries(slotParams).forEach(([key, value]) => {
              voice.setParameter(key, value);
            });
          }
        }
      }

      for (const [slotId, voice] of samplerVoices) {
        if (samplerData.pattern[slotId]?.[step]?.velocity > 0) {
          voice.trigger(time, samplerData.pattern[slotId][step].velocity);
        }
      }
    }
  }

  // Count what we rendered (check both current patterns and arrangement)
  let hasDrums = Object.keys(session.drumPattern).length > 0;
  let hasBass = session.bassPattern.some(s => s.gate);
  let hasLead = session.leadPattern.some(s => s.gate);
  let hasSamples = Object.keys(session.samplerPattern).length > 0 && session.samplerKit;

  if (hasArrangement) {
    // Check if any section uses each instrument
    hasDrums = arrangementPlan.some(s => s.patterns.drums && session.patterns.drums[s.patterns.drums]);
    hasBass = arrangementPlan.some(s => s.patterns.bass && session.patterns.bass[s.patterns.bass]);
    hasLead = leadBuffers.length > 0;
    hasSamples = arrangementPlan.some(s => s.patterns.sampler && session.patterns.sampler[s.patterns.sampler]) && session.samplerKit;
  }

  const synths = [hasDrums && 'R9D9', hasBass && 'R3D3', hasLead && 'R1D1', hasSamples && 'R9DS'].filter(Boolean);

  return context.startRendering().then(buffer => {
    // Mix in pre-rendered lead buffers at their respective positions
    const samplesPerBar = (60 / session.bpm) * 4 * sampleRate;  // 4 beats per bar

    // Get lead output level as linear gain
    const leadMixLevel = leadGain.gain.value;

    for (const { buffer: leadBuffer, startBar } of leadBuffers) {
      const startSample = Math.floor(startBar * samplesPerBar);
      const mixLength = Math.min(buffer.length - startSample, leadBuffer.length);

      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const mainData = buffer.getChannelData(ch);
        const leadData = leadBuffer.getChannelData(ch % leadBuffer.numberOfChannels);
        for (let i = 0; i < mixLength; i++) {
          mainData[startSample + i] += leadData[i] * leadMixLevel;  // Apply node-level gain
        }
      }
    }

    const wav = audioBufferToWav(buffer);
    writeFileSync(filename, Buffer.from(wav));

    // Output message varies based on mode
    if (hasArrangement) {
      const sectionCount = session.arrangement.length;
      return `Rendered ${renderBars} bars (${sectionCount} sections) at ${session.bpm} BPM (${synths.join('+') || 'empty'})`;
    }
    return `Rendered ${renderBars} bars at ${session.bpm} BPM (${synths.join('+') || 'empty'})`;
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

  const baseSystemPrompt = `You are Jambot, an AI that creates music with classic synths.

=== RULE #1: FOLLOW EXACT INSTRUCTIONS ===
When the user gives specific instructions, follow them EXACTLY. No creative variations.
- "kick and hats on 16ths" = kick on 1,5,9,13 AND hats on ALL 16 steps, in EVERY part
- "A and B parts" with same description = IDENTICAL patterns in both parts
- Only get creative when they say "surprise me", "make it interesting", or give vague requests
If in doubt, do EXACTLY what they said. Nothing more, nothing less.

=== RULE #2: SONG MODE - MODIFYING PATTERNS ===
To change a parameter in a saved pattern (A, B, C, etc.):
1. load_pattern(instrument, name) — MUST do this first
2. tweak_drums/tweak_bass/tweak_lead — adjust the parameter
3. save_pattern(instrument, name) — MUST save it back

NEVER use add_drums to change volume/decay/tune — that REPLACES the pattern!
- add_drums = creates NEW pattern (replaces existing steps)
- tweak_drums = adjusts params (level, decay, tune) WITHOUT changing steps

Example: "lower kick volume in part B by 6dB"
CORRECT: load_pattern(drums, B) → tweak_drums(kick, level=-6) → save_pattern(drums, B)
WRONG: add_drums with fewer steps (this erases the pattern!)

=== RULE #3: VERIFY YOUR WORK ===
NEVER say "done" without actually calling the tools. You MUST complete the work before claiming success.
- If asked to "add C and D parts": You MUST call add_drums/add_bass/etc AND save_pattern for EACH new part
- If you didn't call the tools, you didn't do the work
- Check tool results to confirm success before responding
- If a tool fails, report the error — don't claim success

Example: "add parts C and D with tom fills"
YOU MUST:
1. add_drums({...toms...}) for C
2. save_pattern({instrument: 'drums', name: 'C'})
3. add_drums({...different toms...}) for D
4. save_pattern({instrument: 'drums', name: 'D'})
5. set_arrangement with all parts including C and D
6. ONLY THEN say "done"

=== SYNTHS ===
- R9D9 (TR-909 drums) - when user says "909" they mean this
- R3D3 (TB-303 acid bass) - when user says "303" they mean this
- R1D1 (SH-101 lead synth) - when user says "101" they mean this
- R9DS (sampler) - sample-based drums/sounds

=== WORKFLOW ===
Complete the full task - create session, add instruments, AND render. System handles filenames.

SONG MODE:
- save_pattern: Save current working pattern to a named slot (A, B, C)
- load_pattern: Load a saved pattern into the working pattern
- set_arrangement: Define sections with bar counts and pattern assignments
- render: When arrangement is set, renders the full song

=== MIXER ===
Don't add mixer effects by default. Use them when user asks for polish, reverb, sidechain, filter, etc.
- create_send/route_to_send: Reverb buses
- add_sidechain: Ducking (bass ducks on kick)
- add_channel_insert/add_master_insert: EQ or Filter

EQ: Tonal shaping (highpass, lowGain, midGain, midFreq, highGain). Presets: acidBass, crispHats, warmPad, punchyKick, cleanSnare, master.

FILTER: Resonant filter for effects/sweeps. Params: mode (lowpass/highpass/bandpass), cutoff (Hz), resonance (0-100).

=== RULE #4: PER-SECTION FILTERS/EQ ===
Channel inserts (filter, EQ) are saved with patterns. Supports INDIVIDUAL DRUM VOICES (kick, snare, ch, oh, etc.)!

To apply a highpass to ONLY the kick in part C:
1. load_pattern(drums, C)
2. add_channel_insert(channel: 'kick', effect: 'filter', params: {mode: 'highpass', cutoff: 500})
3. save_pattern(drums, C) — filter on kick is now saved with pattern C

To apply a filter to ALL drums in part C:
1. load_pattern(drums, C)
2. add_channel_insert(channel: 'drums', effect: 'filter', ...)
3. save_pattern(drums, C)

To CHANGE filter settings on a specific part:
1. load_pattern(drums, C)
2. add_channel_insert(...new settings...) — replaces existing filter
3. save_pattern(drums, C)

To REMOVE a filter from a part:
1. load_pattern(drums, A)
2. remove_channel_insert(channel: 'kick', effect: 'filter')
3. save_pattern(drums, A)

IMPORTANT: Always load → modify → save for EACH part you want to change!
Presets: dubDelay (LP 800Hz), telephone (BP 1500Hz), lofi (LP 3000Hz), darkRoom (LP 400Hz), airFilter (HP 500Hz), thinOut (HP 1000Hz).
Use filter for: dub effects, lo-fi warmth, breakdown sweeps, radio/telephone sounds.

REVERB params: decay (0.5-10s), damping (0-1), predelay (0-100ms), lowcut/highcut (Hz).
Rule: Always set lowcut=100+ to keep bass out of reverb.

=== CREATING SAMPLE KITS ===
Use create_kit to scan folder, then call again with slots array. Kit auto-loads.

=== PERSONALITY ===
Brief and flavorful. Describe what you made like you're proud of it. Music language (four-on-the-floor, groove, punch, thump, squelch). No emoji. No exclamation marks.`;

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
