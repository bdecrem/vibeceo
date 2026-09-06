/**
 * JB202Node - Modular Bass Synth
 *
 * 2-oscillator bass synth with CUSTOM DSP components:
 *   - PolyBLEP band-limited oscillators
 *   - 24dB/oct cascaded biquad lowpass filter
 *   - Exponential ADSR envelopes
 *   - Soft-clip drive saturation
 *
 * Produces identical output in Web Audio (browser) and WAV rendering (Node.js).
 * Uses the unified parameter system from params/converters.js.
 * Supports variable pattern lengths (default 16 steps = 1 bar).
 */

import { InstrumentNode, coerceChoice } from '../core/node.js';
import { JB202_PARAMS, toEngine, fromEngine } from '../params/converters.js';
import { JB202Engine } from '../../web/public/jb202/dist/machines/jb202/engine.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Voice (monophonic)
const VOICES = ['bass'];

/**
 * Create an empty pattern
 * @param {number} steps - Number of steps (default 16 = 1 bar)
 */
function createEmptyPattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: 'C2',
    gate: false,
    accent: false,
    slide: false,
  }));
}

// Producer-facing aliases → canonical param names. The generic `tweak` tool
// takes any path the agent invents; before this, an unknown name such as
// 'bass.cutoff' was stored under a key no engine reads and
// reported success — the classic "I changed the filter and nothing happened".
const PARAM_ALIASES = {"cutoff": "filterCutoff", "resonance": "filterResonance", "envMod": "filterEnvAmount", "envAmount": "filterEnvAmount"};
function normalizePath(path) {
  let p = path.startsWith('bass.') ? path.slice(5) : path;
  p = PARAM_ALIASES[p] || p;
  return `bass.${p}`;
}

// osc1Octave / osc2Octave are stored in CENTS (the 'semitones' unit's engine
// form: toEngine(-12) = -1200 — what tweak, automation, status and the web
// knobs all assume). The JB202 engine transposes in SEMITONES, so the value
// is divided by 100 at the engine boundary — every path that reaches
// engine.setParameter goes through octaveToEngine(). Before this, -1200
// reached the engine as -1200 semitones: the "sub bass: osc2Octave -12"
// recipe produced a DC thump instead of a sub octave.
const OCTAVE_PARAMS = new Set(['osc1Octave', 'osc2Octave']);

/**
 * Older writers (tweak_jb202, kit loaders, saved patterns/tracks from before
 * the fix) stored raw semitones (-12). Cents from integer semitones are
 * multiples of 100, so a non-zero integer within ±24 can only be legacy
 * semitones: scale it up. Fractional-cent values in (0, 24] are left alone.
 */
function normalizeStoredOctave(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  if (value !== 0 && Number.isInteger(value) && Math.abs(value) <= 24) return value * 100;
  return value;
}

/** Stored cents → engine semitones. */
function octaveToEngine(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  return normalizeStoredOctave(value) / 100;
}

/** Mute pseudo-param: true/1/'true'/'on' mute, anything else unmutes. */
function muteFlag(value) {
  if (typeof value === 'string') return !['false', '0', 'off', 'no', ''].includes(value.toLowerCase());
  return !!value;
}

export class JB202Node extends InstrumentNode {
  constructor(config = {}) {
    super(config.id || 'jb202', config);

    this._voices = VOICES;

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Register all parameters from jb202-params.json
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally for compatibility with render loop
   * Node-level 'level' param is stored in dB and handled by base InstrumentNode
   */
  _registerParams() {
    // Register node-level output (handled by base class in dB)
    this.registerParam('level', { min: -60, max: 6, default: 0, unit: 'dB', hint: 'node output level' });

    const bassDef = JB202_PARAMS.bass;
    if (!bassDef) return;

    for (const [paramName, paramDef] of Object.entries(bassDef)) {
      // Skip 'level' — handled as node-level param by base class
      if (paramName === 'level') continue;

      const path = `bass.${paramName}`;
      this.registerParam(path, {
        ...paramDef,
        voice: 'bass',
        param: paramName,
      });

      // Convert default value from producer units to engine units
      // This matches jambot.js's inline createSession which stores engine units
      if (paramDef.default !== undefined) {
        this._params[path] = toEngine(paramDef.default, paramDef);
      }
    }
  }

  /**
   * Get a single parameter descriptor, normalizing shorthand paths
   * e.g., 'filterCutoff' → looks up 'bass.filterCutoff'
   */
  getDescriptor(path) {
    if (path === 'level') return super.getDescriptor(path);
    const normalizedPath = normalizePath(path);
    return this._descriptors[normalizedPath] || super.getDescriptor(path);
  }

  /**
   * Get a parameter value in producer-friendly units
   * @param {string} path - e.g., 'bass.filterCutoff' or 'filterCutoff' (shorthand)
   * @returns {*}
   */
  getParam(path) {
    // Node-level output handled by base class
    if (path === 'level') {
      return super.getParam(path);
    }
    // Normalize path - add 'bass.' prefix if missing
    const normalizedPath = normalizePath(path);
    return this._params[normalizedPath];
  }

  /**
   * Set a parameter value (stores ENGINE UNITS, 0-1 normalized)
   * Tools convert from producer units before calling this.
   * @param {string} path - e.g., 'bass.filterCutoff' or 'filterCutoff'
   * @param {*} value - Value in engine units (0-1 for most params)
   * @returns {boolean}
   */
  setParam(path, value) {
    // Node-level output handled by base class
    if (path === 'level') {
      return super.setParam(path, value);
    }

    // Normalize path
    const normalizedPath = normalizePath(path);

    // Handle mute — node level to -60 dB; unmute restores the pre-mute level
    // (a falsy value used to be accepted and silently do nothing).
    if (normalizedPath === 'bass.mute' || path === 'mute') {
      if (muteFlag(value)) {
        if (this.getLevel() > -60) this._preMuteLevel = this.getLevel();
        this.setLevel(-60);
      } else {
        this.setLevel(this._preMuteLevel ?? 0);
        this._preMuteLevel = undefined;
      }
      return true;
    }

    // Store engine value directly - no clamping needed
    // The descriptors have producer-friendly ranges (Hz, dB, etc.)
    // but we store engine units (0-1), so clamping against those ranges would be wrong.
    // Tools are responsible for validation before conversion.
    if (!this._descriptors[normalizedPath]) {
      console.warn(`${this.id}: unknown parameter "${path}" (valid: ${Object.keys(this._descriptors).map(k => k.split('.').pop()).join(', ')})`);
      return false;
    }
    const descriptor = this._descriptors[normalizedPath];
    if (descriptor.unit === 'choice') {
      const v = coerceChoice(descriptor, value);
      if (v === undefined) {
        console.warn(`${this.id}: "${path}" must be one of ${(descriptor.options || []).join('|')}, got ${JSON.stringify(value)}`);
        return false;
      }
      value = v;
    }
    if (OCTAVE_PARAMS.has(normalizedPath.slice(5))) {
      // load_pattern / presets may carry legacy raw semitones — store cents
      value = normalizeStoredOctave(value);
    }
    this._params[normalizedPath] = value;
    return true;
  }

  /**
   * Get a parameter value in engine units (0-1)
   * Used by render loop. Values are already stored in engine units.
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const normalizedPath = normalizePath(path);
    return this._params[normalizedPath];
  }

  /**
   * Get all params for bass voice in engine units
   * Values are already stored in engine units (0-1), so we return them directly.
   * @returns {Object}
   */
  getEngineParams() {
    const result = {};
    const bassDef = JB202_PARAMS.bass;

    if (!bassDef) return result;

    for (const paramName of Object.keys(bassDef)) {
      const path = `bass.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        // Values already in engine units — except the octaves: stored cents,
        // engine wants semitones
        result[paramName] = OCTAVE_PARAMS.has(paramName) ? octaveToEngine(value) : value;
      }
    }

    return result;
  }

  /**
   * Get the current pattern
   * @returns {Array}
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Set the pattern
   * @param {Array} pattern - Pattern array (any length, 16 steps = 1 bar)
   */
  setPattern(pattern) {
    this._pattern = pattern;
  }

  /**
   * Get pattern length in steps
   * @returns {number}
   */
  getPatternLength() {
    return this._pattern.length;
  }

  /**
   * Get pattern length in bars (16 steps = 1 bar)
   * @returns {number}
   */
  getPatternBars() {
    return this._pattern.length / 16;
  }

  /**
   * Resize pattern to new length (preserves existing steps, fills new steps with empty)
   * @param {number} steps - New pattern length in steps
   */
  resizePattern(steps) {
    const current = this._pattern;
    if (steps === current.length) return;

    if (steps < current.length) {
      this._pattern = current.slice(0, steps);
    } else {
      const empty = createEmptyPattern(steps - current.length);
      this._pattern = [...current, ...empty];
    }
  }

  /**
   * Serialize full JB202 state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
    };
  }

  /**
   * Deserialize JB202 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) {
      // Tracks saved by tweak_jb202 / kit loads before the cents fix hold raw
      // semitones for the octaves; migrate so they keep their pitch.
      const params = { ...data.params };
      for (const key of ['bass.osc1Octave', 'bass.osc2Octave']) {
        if (key in params) params[key] = normalizeStoredOctave(params[key]);
      }
      data = { ...data, params };
    }
    super.deserialize(data);   // base class validates choice params
  }

  /**
   * Render the pattern to an audio buffer using custom DSP
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render (pattern loops to fill)
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @param {Array} [options.pattern] - Optional pattern override (uses node's pattern if not provided)
   * @param {Object} [options.params] - Optional params override (uses node's params if not provided)
   * @returns {Promise<AudioBuffer>}
   */
  async renderPattern(options) {
    const {
      bars,
      stepDuration,
      swing = 0,
      sampleRate = 44100,
      pattern = this._pattern,
      params = null,
      automation = null,
    } = options;

    // Skip if no active notes
    if (!pattern?.some(s => s.gate)) {
      return null;
    }

    // Create engine with fresh context
    const context = new OfflineAudioContext(2, sampleRate, sampleRate);
    const engine = new JB202Engine({ context });

    // Apply node's registered params (converted from jb202-params.json defaults)
    // If explicit params override provided (saved pattern, raw stored values),
    // use those instead — octaves are stored cents, the engine takes semitones.
    const engineParams = params ? { ...params } : this.getEngineParams();
    if (params) {
      for (const key of OCTAVE_PARAMS) {
        if (key in engineParams) engineParams[key] = octaveToEngine(engineParams[key]);
      }
    }
    Object.entries(engineParams).forEach(([key, value]) => {
      engine.setParameter(key, value);
    });

    // Set pattern on engine
    engine.setPattern(pattern);

    // Convert automation from producer units to engine units
    // Automation uses node-relative paths: 'bass.filterCutoff', 'filterCutoff'
    // or an alias ('cutoff') — resolve them the same way tweak does.
    // Use node's own automation if no explicit automation passed
    const rawAutomation = automation || this._getAutomationForRender();
    let engineAutomation = undefined;
    if (rawAutomation && Object.keys(rawAutomation).length > 0) {
      engineAutomation = {};
      for (const [path, values] of Object.entries(rawAutomation)) {
        const paramName = normalizePath(path).slice(5);
        const paramDef = JB202_PARAMS.bass?.[paramName];
        if (paramDef && Array.isArray(values)) {
          const isOctave = OCTAVE_PARAMS.has(paramName);
          engineAutomation[paramName] = values.map(v => {
            if (v === null || v === undefined) return null;
            const e = toEngine(v, paramDef);
            return isOctave ? e / 100 : e;   // cents → semitones for the engine
          });
        }
      }
    }

    // Render
    const buffer = await engine.renderPattern({
      bars,
      stepDuration,
      swing,
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
    // This is populated by render.js before calling renderPattern
    return this._renderAutomation || null;
  }
}
