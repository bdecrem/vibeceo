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
    drumKit: 'default',  // Kit ID for engine selection
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
    description: "Adjust drum voice parameters. Each voice has specific params: kick (tune, decay, attack, sweep, level), snare (tune, tone, snappy, level), clap/tom/hihat (decay, tone, level).",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to tweak"
        },
        decay: { type: "number", description: "Decay/length (0.05-2.0). Lower = shorter, punchier. Higher = longer." },
        tune: { type: "number", description: "Pitch tuning in cents (-1200 to +1200). -100 = 1 semitone down." },
        tone: { type: "number", description: "Brightness (0-1). Lower = darker. Works on snare, clap, hats, cymbals, rimshot." },
        level: { type: "number", description: "Volume (0-1)" },
        attack: { type: "number", description: "Kick attack transient (0-1). Higher = more click. (kick only)" },
        sweep: { type: "number", description: "Kick pitch sweep amount (0-1). Higher = more 'boom'. (kick only)" },
        snappy: { type: "number", description: "Snare noise/wire amount (0-1). Higher = more snap. (snare only)" }
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
        accent: { type: "number", description: "Accent intensity (0-1). How much accented notes pop." },
        level: { type: "number", description: "Master volume (0-1). Use to balance with other instruments." }
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
    description: "Adjust R1D1 lead synth parameters. Controls oscillators, sub-osc, filter, envelope, and LFO modulation.",
    input_schema: {
      type: "object",
      properties: {
        // Oscillators
        vcoSaw: { type: "number", description: "Sawtooth level (0-1)" },
        vcoPulse: { type: "number", description: "Pulse/square level (0-1)" },
        pulseWidth: { type: "number", description: "Pulse width (0-1). 0.5 = square wave" },
        // Sub-oscillator
        subLevel: { type: "number", description: "Sub-oscillator level (0-1). Adds low-end beef." },
        subMode: { type: "number", description: "Sub-oscillator mode: 0=off, 1=-1oct square, 2=-2oct square, 3=pulse" },
        // Filter
        cutoff: { type: "number", description: "Filter cutoff (0-1)" },
        resonance: { type: "number", description: "Filter resonance (0-1)" },
        envMod: { type: "number", description: "Filter envelope depth (0-1)" },
        // Envelope
        attack: { type: "number", description: "Envelope attack (0-1). 0=instant, 1=slow fade in" },
        decay: { type: "number", description: "Envelope decay (0-1)" },
        sustain: { type: "number", description: "Envelope sustain level (0-1)" },
        release: { type: "number", description: "Envelope release (0-1). How long note tails after release" },
        // LFO
        lfoRate: { type: "number", description: "LFO speed (0-1). 0=slow, 1=fast" },
        lfoWaveform: { type: "string", enum: ["triangle", "square", "sh"], description: "LFO waveform. 'sh' = sample-and-hold (random)" },
        lfoToPitch: { type: "number", description: "LFO modulation to pitch (0-1). Creates vibrato." },
        lfoToFilter: { type: "number", description: "LFO modulation to filter (0-1). Creates wah/wobble effects." },
        lfoToPW: { type: "number", description: "LFO modulation to pulse width (0-1). Creates PWM movement." },
        // Output
        level: { type: "number", description: "Master volume (0-1). Use to balance with other instruments." }
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
    description: "Add an insert effect to a channel (drums, bass, lead, sampler). Insert effects process the entire channel.",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["drums", "bass", "lead", "sampler"], description: "Channel to add effect to" },
        effect: { type: "string", enum: ["eq", "ducker"], description: "Type of effect" },
        preset: { type: "string", description: "Effect preset (eq: 'acidBass'/'crispHats'/'warmPad')" },
        params: {
          type: "object",
          description: "Effect parameters (eq: highpass, lowGain, midGain, midFreq, highGain; ducker: amount, trigger)"
        }
      },
      required: ["channel", "effect"]
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
// context is optional: { renderPath, onRender }
export async function executeTool(name, input, session, context = {}) {
  if (name === "create_session") {
    session.bpm = input.bpm;
    session.swing = 0;
    // Reset R9D9 (drums)
    session.drumKit = 'default';
    session.drumPattern = {};
    session.drumParams = {};
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
    // Kit params are applied at render time from the kit definition
    // drumParams holds only user tweaks (from tweak_drums)
    return `Loaded 909 kit "${kit.name}" (${kit.engine} engine)`;
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
    // Common params
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
    // Kick-specific params
    if (input.attack !== undefined) {
      session.drumParams[voice].attack = input.attack;
      tweaks.push(`attack=${input.attack}`);
    }
    if (input.sweep !== undefined) {
      session.drumParams[voice].sweep = input.sweep;
      tweaks.push(`sweep=${input.sweep}`);
    }
    // Snare-specific param
    if (input.snappy !== undefined) {
      session.drumParams[voice].snappy = input.snappy;
      tweaks.push(`snappy=${input.snappy}`);
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
    if (input.level !== undefined) {
      session.bassParams.level = input.level;
      tweaks.push(`level=${input.level}`);
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
    // All available params: oscillators, sub-osc, filter, envelope, LFO, output
    const params = [
      'vcoSaw', 'vcoPulse', 'pulseWidth',
      'subLevel', 'subMode',
      'cutoff', 'resonance', 'envMod',
      'attack', 'decay', 'sustain', 'release',
      'lfoRate', 'lfoWaveform', 'lfoToPitch', 'lfoToFilter', 'lfoToPW',
      'level'
    ];
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

  // Add channel insert
  if (name === "add_channel_insert") {
    const { channel, effect, preset, params } = input;

    if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
    if (!session.mixer.channelInserts[channel]) session.mixer.channelInserts[channel] = [];

    session.mixer.channelInserts[channel].push({
      type: effect,
      preset,
      params: params || {}
    });

    return `Added ${effect}${preset ? ` (${preset})` : ''} insert to ${channel} channel`;
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
  // Get kit - EXACTLY like web app's loadKit()
  const drumKit = TR909_KITS.find(k => k.id === session.drumKit) || TR909_KITS[0];
  const drums = new TR909Engine({ context });
  drums.connectOutput(masterGain);  // Route through mixer

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
          drums.setVoiceParameter(voiceId, param.id, param.defaultValue);
        } catch (e) {
          // Ignore - param may not exist on current engine
        }
      });
    });
  }

  // Step 5: Apply kit.voiceParams (like web app)
  if (drumKit.voiceParams) {
    Object.entries(drumKit.voiceParams).forEach(([voiceId, params]) => {
      Object.entries(params).forEach(([paramId, value]) => {
        try {
          drums.setVoiceParameter(voiceId, paramId, value);
        } catch (e) {
          // Ignore
        }
      });
    });
  }

  // Step 6: Apply user tweaks on top (jambot-specific)
  for (const name of voiceNames) {
    const userParams = session.drumParams[name];
    if (userParams) {
      Object.entries(userParams).forEach(([paramId, value]) => {
        try {
          drums.setVoiceParameter(name, paramId, value);
        } catch (e) {
          // Ignore
        }
      });
    }
  }

  // === R3D3 (Bass) ===
  const bass = new TB303Engine({ context, engine: 'E1' });
  bass.connectOutput(masterGain);  // Route through mixer
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
  // Use engine's own renderPattern for accurate sound (same as web app)
  // Create separate context for lead init (renderPattern creates its own for rendering)
  const leadInitContext = new OfflineAudioContext(2, 44100, 44100);  // Minimal dummy
  const lead = new SH101Engine({ context: leadInitContext, engine: 'E1' });
  // Apply lead params (map 'level' to 'volume' for SH-101 engine)
  Object.entries(session.leadParams).forEach(([key, value]) => {
    const paramKey = key === 'level' ? 'volume' : key;
    lead.setParameter(paramKey, value);
  });
  // Set the pattern on the engine
  lead.setPattern(session.leadPattern);

  // Pre-render the lead using engine's own method (matches web app exactly)
  let leadBuffer = null;
  if (session.leadPattern.some(s => s.gate)) {
    leadBuffer = await lead.renderPattern({ bars, bpm: session.bpm });
  }

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

  // Channel inserts (EQ, ducker) - track which channels have been rerouted
  const channelOutputs = new Map(); // channel -> final output node

  if (mixerConfig.channelInserts) {
    for (const [channel, inserts] of Object.entries(mixerConfig.channelInserts)) {
      // Get the channel's source output
      let sourceOutput = null;
      if (channel === 'bass' && bass.masterGain) {
        sourceOutput = bass.masterGain;
      } else if (channel === 'drums' && drums.compressor) {
        sourceOutput = drums.compressor;
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

      // Connect chain output to master
      if (chainOutput) {
        chainOutput.connect(masterGain);
        channelOutputs.set(channel, chainOutput);
      } else {
        // No inserts applied, reconnect directly
        sourceOutput.connect(masterGain);
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

        // Schedule sidechain ducking if this voice is a trigger
        for (const [targetChannel, scConfig] of sidechainTargets) {
          if (scConfig.trigger === name) {
            const attackTime = 0.005; // 5ms attack
            const releaseTime = 0.15; // 150ms release
            const targetGain = 1 - scConfig.amount;

            scConfig.gain.gain.setValueAtTime(1, time);
            scConfig.gain.gain.linearRampToValueAtTime(targetGain, time + attackTime);
            scConfig.gain.gain.linearRampToValueAtTime(1, time + attackTime + releaseTime);
          }
        }
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

    // R1D1 lead is pre-rendered above using engine.renderPattern()

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
    // Mix in pre-rendered lead buffer if present
    if (leadBuffer) {
      const mixLength = Math.min(buffer.length, leadBuffer.length);
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const mainData = buffer.getChannelData(ch);
        const leadData = leadBuffer.getChannelData(ch % leadBuffer.numberOfChannels);
        for (let i = 0; i < mixLength; i++) {
          mainData[i] += leadData[i] * 0.8;  // Mix at 80% level
        }
      }
    }

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

MIXER (DAW-like routing):
- create_send: Make a send bus with reverb. Use for hats, snare, claps - anything that needs space.
- route_to_send: Send a voice to the bus. Order matters: create_send first, then route_to_send.
- tweak_reverb: Adjust reverb parameters after creation.
- add_sidechain: Classic pump - bass/lead ducks when kick hits. Amount 0.3-0.5 is subtle, 0.6-0.8 is pumpy.
- add_channel_insert: Put EQ on a channel (bass, drums). Presets: acidBass, crispHats, warmPad, punchyKick, cleanSnare.
- add_master_insert: Put EQ on the master bus. Use preset 'master' for gentle polish.
- analyze_render: After rendering, check levels and frequency balance. Use recommendations to improve.
- show_mixer: See current routing.

EQ (3-band + highpass):
- highpass: cut mud below this Hz (e.g., 60 for bass, 200 for hats)
- lowGain: boost/cut low shelf in dB
- midGain/midFreq: boost/cut mid peak
- highGain: boost/cut high shelf

REVERB (Dattorro plate algorithm):
Parameters: decay (0.5-10s), damping (0-1), predelay (0-100ms), modulation (0-1), lowcut/highcut (Hz), width (0-1), mix (0-1).
Quick presets by genre:
- Tight drums: decay=1, damping=0.6, predelay=10, lowcut=200
- Lush pads: decay=4, damping=0.3, modulation=0.5, width=1
- Dark dub: decay=3, damping=0.8, predelay=50, highcut=4000
- Bright pop: decay=1.5, damping=0.2, modulation=0.4
Rule: Always set lowcut=100+ to keep bass out of reverb. Use predelay=20-40 for clarity.

WHEN TO MIX: Don't add mixer effects by default. Use them when:
- User asks for polish/production/professional sound
- User mentions reverb, space, room, wet
- User mentions sidechain, pump, ducking
- User wants to analyze/improve a render

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
