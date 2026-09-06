/**
 * JT90Node - Drum Machine (909-style)
 *
 * Multi-voice drum machine with hybrid synthesis + samples:
 *   - Kick, snare, clap, rimshot, toms: pure JS DSP synthesis
 *   - CH, OH, crash, ride: WAV sample playback (loaded from disk in Node.js)
 */

import { InstrumentNode, coerceChoice } from '../core/node.js';
import { OfflineAudioContext } from 'node-web-audio-api';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load params definition
import { createRequire } from 'module';
import { toEngine } from '../params/converters.js';
const require = createRequire(import.meta.url);
const JT90_PARAMS = require('../params/jt90-params.json');

// Path to JT90 sample WAVs
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SAMPLES_DIR = resolve(__dirname, '../../web/public/jt90/samples');

// Sample voice WAV files (must match SAMPLE_CONFIGS in engine.js)
const SAMPLE_FILES = ['ch.wav', 'oh.wav', 'crash.wav', 'ride.wav'];

/**
 * Load JT90 sample WAVs from disk and pass to engine.loadSamples().
 * Decodes WAVs locally and passes pre-decoded data through the public API.
 */
async function loadSamplesFromDisk(engine) {
  const { decodeWav } = await import('../../web/public/jt90/dist/machines/jt90/voices/sample-voice.js');

  const sampleData = {};
  for (const file of SAMPLE_FILES) {
    const voiceId = file.replace('.wav', '');
    const buf = readFileSync(resolve(SAMPLES_DIR, file));
    sampleData[voiceId] = decodeWav(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  await engine.loadSamples(sampleData);
}

// All drum voices (user-facing names)
const VOICES = ['kick', 'snare', 'clap', 'rimshot', 'lowtom', 'midtom', 'hitom', 'ch', 'oh', 'crash', 'ride'];

// Map from user-facing voice names to engine voice names
const VOICE_TO_ENGINE = {
  kick: 'kick',
  snare: 'snare',
  clap: 'clap',
  rimshot: 'rimshot',
  lowtom: 'ltom',
  midtom: 'mtom',
  hitom: 'htom',
  ch: 'ch',
  oh: 'oh',
  crash: 'crash',
  ride: 'ride',
};

/**
 * Create an empty multi-track pattern
 */
function createEmptyPattern(steps = 16) {
  const pattern = {};
  for (const voice of VOICES) {
    pattern[voice] = Array(steps).fill(null).map(() => ({
      velocity: 0,
      accent: false,
    }));
  }
  return pattern;
}

const STEPS_PER_BAR = 16;

/** Longest voice in a pattern, rounded up to whole bars (at least one bar). */
function patternLengthOf(pattern) {
  let max = 0;
  for (const track of Object.values(pattern || {})) {
    if (Array.isArray(track) && track.length > max) max = track.length;
  }
  if (max === 0) return STEPS_PER_BAR;
  return Math.ceil(max / STEPS_PER_BAR) * STEPS_PER_BAR;
}

/**
 * Bring every voice to the same length — the longest one — by repeating
 * shorter voices. The JT90 engine reads `track[step]` for step < longest
 * voice, so a 16-step hat next to a 32-step kick used to fall silent in bar 2
 * (JB01's engine wraps per voice; the two machines disagreed). Normalising
 * here keeps the fix in the node layer and off the kochi.to UI's engine.
 * Voices missing from the object are added as silence.
 */
function normalizePattern(pattern) {
  const src = pattern && typeof pattern === 'object' ? pattern : {};
  const length = patternLengthOf(src);
  const out = {};
  const keys = [...VOICES, ...Object.keys(src).filter(k => !VOICES.includes(k))];
  for (const voice of keys) {
    const track = Array.isArray(src[voice]) && src[voice].length > 0 ? src[voice] : null;
    if (track && track.length === length) { out[voice] = track; continue; }
    out[voice] = Array(length).fill(null).map((_, i) => {
      const s = track ? track[i % track.length] : null;
      return s && typeof s === 'object'
        ? { ...s, velocity: s.velocity > 0 ? s.velocity : 0, accent: !!s.accent }
        : { velocity: 0, accent: false };
    });
  }
  return out;
}

export class JT90Node extends InstrumentNode {
  constructor(config = {}) {
    super(config.id || 'jt90', config);

    this._voices = VOICES;
    this._pattern = createEmptyPattern();
    this._swing = 0;
    this._accentLevel = 1.0;
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   */
  _registerParams() {
    // Register node-level output (handled by base class in dB)
    const nodeDef = JT90_PARAMS._node;
    if (nodeDef?.level) {
      this.registerParam('level', nodeDef.level);
    }

    for (const voice of VOICES) {
      const voiceDef = JT90_PARAMS[voice];
      if (!voiceDef) continue;

      for (const [paramName, paramDef] of Object.entries(voiceDef)) {
        const path = `${voice}.${paramName}`;
        this.registerParam(path, {
          ...paramDef,
          voice,
          param: paramName,
        });

        if (paramDef.default !== undefined) {
          this._params[path] = toEngine(paramDef.default, paramDef);
        }
      }
    }
  }

  /**
   * Get a parameter value
   */
  getParam(path) {
    if (path === 'level') return super.getParam(path);
    return this._params[path];
  }

  /**
   * Set a parameter value
   */
  setParam(path, value) {
    if (path === 'level') return super.setParam(path, value);

    // Handle mute for any voice
    if (path.endsWith('.mute')) {
      const voice = path.split('.')[0];
      if (!VOICES.includes(voice)) {
        console.warn(`${this.id}: unknown voice "${voice}" (voices: ${VOICES.join(', ')})`);
        return false;
      }
      if (value) {
        this._params[`${voice}.level`] = 0;
      }
      return true;
    }

    // Refuse unknown keys instead of storing them: "jt90.kick.decayy" used to
    // report "Set …" and silently change nothing (jb202/jt10/jt30 already refuse).
    const descriptor = this._descriptors[path];
    if (!descriptor) {
      const voice = path.split('.')[0];
      const hint = VOICES.includes(voice)
        ? `valid for ${voice}: ${Object.keys(JT90_PARAMS[voice] || {}).join(', ')}`
        : `voices: ${VOICES.join(', ')}`;
      // warn once per path — a saved track with stray keys replays them on every load
      this._warnedUnknown ??= new Set();
      if (!this._warnedUnknown.has(path)) {
        this._warnedUnknown.add(path);
        console.warn(`${this.id}: unknown parameter "${path}" (${hint})`);
      }
      return false;
    }
    if (descriptor.unit === 'choice') {
      const v = coerceChoice(descriptor, value);
      if (v === undefined) {
        console.warn(`${this.id}: "${path}" must be one of ${(descriptor.options || []).join('|')}, got ${JSON.stringify(value)}`);
        return false;
      }
      value = v;
    } else if (typeof value !== 'number' || !Number.isFinite(value)) {
      console.warn(`${this.id}: "${path}" expects a number, got ${JSON.stringify(value)}`);
      return false;
    }

    this._params[path] = value;
    return true;
  }

  /**
   * Get engine param
   */
  getEngineParam(path) {
    return this._params[path];
  }

  /**
   * Get all params for a voice in engine units
   */
  getVoiceParams(voiceId) {
    const result = {};
    const voiceDef = JT90_PARAMS[voiceId];

    if (!voiceDef) return result;

    for (const paramName of Object.keys(voiceDef)) {
      const path = `${voiceId}.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        result[paramName] = value;
      }
    }

    return result;
  }

  /**
   * Get all voice params for all voices
   */
  getAllVoiceParams() {
    const result = {};
    for (const voice of VOICES) {
      result[voice] = this.getVoiceParams(voice);
    }
    return result;
  }

  /**
   * Get swing amount
   */
  getSwing() {
    return this._swing;
  }

  /**
   * Set swing amount
   */
  setSwing(swing) {
    this._swing = Math.max(0, Math.min(1, swing));
  }

  /**
   * Get accent level
   */
  getAccentLevel() {
    return this._accentLevel;
  }

  /**
   * Set accent level
   */
  setAccentLevel(level) {
    this._accentLevel = Math.max(0, Math.min(1, level));
  }

  /**
   * Get the current pattern (all tracks)
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Get pattern for a specific track
   */
  getTrackPattern(voiceId) {
    return this._pattern[voiceId] || [];
  }

  /**
   * Set the full pattern
   */
  setPattern(pattern) {
    this._pattern = normalizePattern(pattern);
  }

  /**
   * Set pattern for a specific track
   */
  setTrackPattern(voiceId, trackPattern) {
    if (VOICES.includes(voiceId)) {
      this._pattern[voiceId] = trackPattern;
      this._pattern = normalizePattern(this._pattern);
    }
  }

  /**
   * Set a step for a specific track
   */
  setTrackStep(voiceId, stepIndex, stepData) {
    if (VOICES.includes(voiceId) && this._pattern[voiceId]) {
      this._pattern[voiceId][stepIndex] = {
        ...this._pattern[voiceId][stepIndex],
        ...stepData,
      };
    }
  }

  /**
   * Get pattern length in steps
   */
  getPatternLength() {
    // Longest voice, not the kick's: serialize() used the kick length and a
    // longer hat lost its bar-2+ hits on every autosave/reload.
    return patternLengthOf(this._pattern);
  }

  /**
   * Get pattern length in bars
   */
  getPatternBars() {
    return this.getPatternLength() / 16;
  }

  /**
   * Resize pattern
   */
  resizePattern(steps) {
    for (const voice of VOICES) {
      const current = this._pattern[voice] || [];
      if (steps === current.length) continue;

      if (steps < current.length) {
        this._pattern[voice] = current.slice(0, steps);
      } else {
        const empty = Array(steps - current.length).fill(null).map(() => ({
          velocity: 0,
          accent: false,
        }));
        this._pattern[voice] = [...current, ...empty];
      }
    }
  }

  /**
   * Serialize JT90 state (sparse format)
   * - Patterns: only store steps with velocity > 0
   * - Params: only store values that differ from defaults
   * @returns {Object}
   */
  serialize() {
    // Sparse pattern: only store active steps
    const sparsePattern = {};
    for (const [voice, steps] of Object.entries(this._pattern)) {
      const activeSteps = [];
      steps.forEach((step, i) => {
        if (step.velocity > 0) {
          activeSteps.push({ i, v: step.velocity, a: step.accent || undefined });
        }
      });
      if (activeSteps.length > 0) {
        sparsePattern[voice] = activeSteps;
      }
    }

    // Sparse params: only store non-default values
    const sparseParams = {};
    for (const [path, value] of Object.entries(this._params)) {
      const [voice, paramName] = path.split('.');
      const paramDef = JT90_PARAMS[voice]?.[paramName];
      if (paramDef) {
        const defaultEngine = toEngine(paramDef.default, paramDef);
        if (Math.abs(value - defaultEngine) > 0.001) {
          sparseParams[path] = value;
        }
      }
    }

    return {
      id: this.id,
      pattern: Object.keys(sparsePattern).length > 0 ? sparsePattern : undefined,
      patternLength: this.getPatternLength(),
      params: Object.keys(sparseParams).length > 0 ? sparseParams : undefined,
      swing: this._swing !== 0 ? this._swing : undefined,
      accentLevel: this._accentLevel !== 1.0 ? this._accentLevel : undefined,
    };
  }

  /**
   * Deserialize JT90 state
   * Handles both sparse and legacy full formats
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) {
      // Check if sparse format (array of {i, v, a}) or legacy full format
      const firstVoice = Object.values(data.pattern)[0];
      const isSparse = Array.isArray(firstVoice) && firstVoice[0]?.i !== undefined;

      if (isSparse) {
        // Older saves wrote patternLength = kick length, so a voice longer than
        // the kick kept its hits in the sparse list but they were dropped here
        // (step.i >= length). Grow to whatever the saved steps need — the hits
        // are still in the JSON, so existing tracks get them back.
        let maxStep = -1;
        for (const steps of Object.values(data.pattern)) {
          for (const step of steps || []) {
            if (Number.isInteger(step?.i) && step.i > maxStep) maxStep = step.i;
          }
        }
        const needed = maxStep >= 0 ? Math.ceil((maxStep + 1) / STEPS_PER_BAR) * STEPS_PER_BAR : 0;
        const length = Math.max(data.patternLength || 16, needed);

        // Expand sparse pattern to full
        this._pattern = createEmptyPattern(length);
        for (const [voice, steps] of Object.entries(data.pattern)) {
          if (this._pattern[voice]) {
            for (const step of steps) {
              if (step.i < length) {
                this._pattern[voice][step.i] = {
                  velocity: step.v,
                  accent: step.a || false,
                };
              }
            }
          }
        }
      } else {
        // Legacy full format (per-voice arrays, possibly of mixed lengths)
        this._pattern = normalizePattern(JSON.parse(JSON.stringify(data.pattern)));
      }
    }

    if (data.params) {
      // Only descriptor-backed values: saved tracks may carry keys written
      // before setParam validated (typos, or objects from the old kit loader).
      for (const [path, value] of Object.entries(data.params)) {
        const d = this._descriptors[path];
        if (!d) continue;
        if (d.unit === 'choice') {
          const v = coerceChoice(d, value);
          this._params[path] = v === undefined ? d.default : v;
        } else if (typeof value === 'number' && Number.isFinite(value)) {
          this._params[path] = value;
        }
      }
    }
    if (data.swing !== undefined) this._swing = data.swing;
    if (data.accentLevel !== undefined) this._accentLevel = data.accentLevel;
  }

  /**
   * Render the pattern to an audio buffer
   */
  async renderPattern(options) {
    const {
      bars,
      stepDuration,
      swing = 0,
      sampleRate = 44100,
      params = null,
      automation = null,
    } = options;
    // Saved song-mode patterns can still hold voices of different lengths;
    // the engine only wraps at the longest, so even them out first.
    const pattern = normalizePattern(options.pattern ?? this._pattern);

    // Check if any track has active steps
    const hasActiveSteps = VOICES.some(voice =>
      pattern[voice]?.some(s => s.velocity > 0)
    );

    if (!hasActiveSteps) {
      return null;
    }

    // Dynamic import of the engine
    const { JT90Engine } = await import('../../web/public/jt90/dist/machines/jt90/engine.js');

    // Create engine with fresh context
    const context = new OfflineAudioContext(2, sampleRate, sampleRate);
    const engine = new JT90Engine({ context });

    // Load sample WAVs from disk (CH, OH, crash, ride need this)
    await loadSamplesFromDisk(engine);

    // Apply voice params (convert voice names to engine names)
    const voiceParams = params || this.getAllVoiceParams();
    Object.entries(voiceParams).forEach(([voiceId, voiceParamSet]) => {
      const engineVoice = VOICE_TO_ENGINE[voiceId] || voiceId;
      Object.entries(voiceParamSet).forEach(([paramName, value]) => {
        engine.setVoiceParameter(engineVoice, paramName, value);
      });
    });

    // Convert pattern voice names to engine names
    const enginePattern = {};
    Object.entries(pattern).forEach(([voiceId, trackPattern]) => {
      const engineVoice = VOICE_TO_ENGINE[voiceId] || voiceId;
      enginePattern[engineVoice] = trackPattern;
    });

    // Set pattern
    engine.setPattern(enginePattern);

    // Convert automation from producer units to engine units, user names to engine names
    const rawAutomation = automation || this._getAutomationForRender();
    let engineAutomation = undefined;
    if (rawAutomation && Object.keys(rawAutomation).length > 0) {
      engineAutomation = {};
      for (const [path, values] of Object.entries(rawAutomation)) {
        const [voice, param] = path.split('.');
        const engineVoice = VOICE_TO_ENGINE[voice] || voice;
        const paramDef = JT90_PARAMS[voice]?.[param];
        if (paramDef && Array.isArray(values)) {
          engineAutomation[`${engineVoice}.${param}`] = values.map(v =>
            v !== null && v !== undefined ? toEngine(v, paramDef) : null
          );
        }
      }
    }

    // Compute BPM from stepDuration (stepDuration = seconds per 16th note)
    const bpm = stepDuration ? 60 / (stepDuration * 4) : undefined;

    // Render
    const buffer = await engine.renderPattern({
      bars,
      bpm,
      swing: swing || this._swing,
      sampleRate,
      automation: engineAutomation,
    });

    return buffer;
  }

  /**
   * Get automation data for rendering (from ParamSystem via session)
   * Returns automation in producer units with node-relative paths
   * @returns {Object|null}
   */
  _getAutomationForRender() {
    return this._renderAutomation || null;
  }

  /**
   * Render each voice to a separate buffer (for per-voice effects)
   * @param {Object} options - Same as renderPattern options
   * @returns {Promise<Object>} Map of voice -> AudioBuffer
   */
  async renderVoices(options) {
    const {
      bars,
      stepDuration,
      swing = 0,
      sampleRate = 44100,
      params = null,
      automation = null,
    } = options;
    const pattern = normalizePattern(options.pattern ?? this._pattern);

    const { JT90Engine } = await import('../../web/public/jt90/dist/machines/jt90/engine.js');
    const voiceBuffers = {};

    // Convert automation from producer units to engine units + user->engine
    // voice names, once. (Same conversion as renderPattern — without this,
    // adding any voice-level effect silently disabled all automation.)
    const rawAutomation = automation || this._getAutomationForRender();
    let engineAutomation = undefined;
    if (rawAutomation && Object.keys(rawAutomation).length > 0) {
      engineAutomation = {};
      for (const [path, values] of Object.entries(rawAutomation)) {
        const [voice, param] = path.split('.');
        const engineVoice = VOICE_TO_ENGINE[voice] || voice;
        const paramDef = JT90_PARAMS[voice]?.[param];
        if (paramDef && Array.isArray(values)) {
          engineAutomation[`${engineVoice}.${param}`] = values.map(v =>
            v !== null && v !== undefined ? toEngine(v, paramDef) : null
          );
        }
      }
    }

    for (const voice of VOICES) {
      // Check if this voice has any hits
      const trackPattern = pattern[voice];
      const hasHits = trackPattern?.some(s => s.velocity > 0);
      if (!hasHits) continue;

      // Create a pattern with only this voice
      const soloPattern = {};
      for (const v of VOICES) {
        const engineVoice = VOICE_TO_ENGINE[v] || v;
        if (v === voice) {
          soloPattern[engineVoice] = trackPattern;
        } else {
          soloPattern[engineVoice] = Array(trackPattern.length).fill(null).map(() => ({
            velocity: 0,
            accent: false,
          }));
        }
      }

      // Create engine with fresh context
      const context = new OfflineAudioContext(2, sampleRate, sampleRate);
      const engine = new JT90Engine({ context });

      // Load sample WAVs from disk (CH, OH, crash, ride need this)
      await loadSamplesFromDisk(engine);

      // Apply this voice's params
      const engineVoice = VOICE_TO_ENGINE[voice] || voice;
      const voiceParamSet = params?.[voice] || this.getVoiceParams(voice);
      Object.entries(voiceParamSet).forEach(([paramName, value]) => {
        engine.setVoiceParameter(engineVoice, paramName, value);
      });

      // Set pattern and render
      engine.setPattern(soloPattern);
      const bpm = stepDuration ? 60 / (stepDuration * 4) : undefined;
      const buffer = await engine.renderPattern({
        bars,
        bpm,
        swing: swing || this._swing,
        sampleRate,
        automation: engineAutomation,
      });

      if (buffer) {
        voiceBuffers[voice] = buffer;
      }
    }

    return voiceBuffers;
  }
}
