/**
 * JB01Node - Reference Drum Machine
 *
 * 8-voice drum machine with pattern storage.
 * Exposes parameters through the unified parameter system.
 * Supports variable pattern lengths (default 16 steps = 1 bar).
 */

import { InstrumentNode, coerceChoice } from '../core/node.js';
import { JB01_PARAMS, toEngine, fromEngine } from '../params/converters.js';
import { JB01Engine } from '../../web/public/jb01/dist/machines/jb01/engine.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Voice IDs
const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'cymbal'];

/**
 * Create an empty pattern for one voice
 * @param {number} steps - Number of steps (default 16 = 1 bar)
 */
function createEmptyVoicePattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    velocity: 0,
    accent: false,
  }));
}

/**
 * Create an empty pattern for all voices
 * @param {number} steps - Number of steps (default 16 = 1 bar)
 */
function createEmptyPattern(steps = 16) {
  const pattern = {};
  for (const voice of VOICES) {
    pattern[voice] = createEmptyVoicePattern(steps);
  }
  return pattern;
}

const STEPS_PER_BAR = 16;

/** Longest voice, rounded up to whole bars (at least one bar). */
function patternLengthOf(pattern) {
  let max = 0;
  for (const track of Object.values(pattern || {})) {
    if (Array.isArray(track) && track.length > max) max = track.length;
  }
  if (max === 0) return STEPS_PER_BAR;
  return Math.ceil(max / STEPS_PER_BAR) * STEPS_PER_BAR;
}

/**
 * Bring every voice to the longest length by repeating shorter ones. The
 * JB01 engine already wraps per voice, so this changes nothing audible; it
 * keeps getPatternLength()/automation looping consistent with JT90 and
 * gives missing voices an explicit (silent) track.
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

export class JB01Node extends InstrumentNode {
  constructor(config = {}) {
    super(config.id || 'jb01', config);

    this._voices = VOICES;

    // -6dB default for proper gain staging
    this.setLevel(-6);

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Register all parameters from jb01-params.json
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally
   */
  _registerParams() {
    // Register node-level output (in dB, not engine units)
    this.registerParam('level', { min: -60, max: 6, default: -6, unit: 'dB', hint: 'node output level' });

    for (const voice of VOICES) {
      const voiceDef = JB01_PARAMS[voice];
      if (!voiceDef) continue;

      for (const [paramName, paramDef] of Object.entries(voiceDef)) {
        const path = `${voice}.${paramName}`;
        this.registerParam(path, {
          ...paramDef,
          voice,
          param: paramName,
        });

        // Convert default value from producer units to engine units
        // Semitones and choices pass through (engine expects them as-is)
        if (paramDef.default !== undefined) {
          if (paramDef.unit === 'semitones' || paramDef.unit === 'choice') {
            this._params[path] = paramDef.default;
          } else {
            this._params[path] = toEngine(paramDef.default, paramDef);
          }
        }
      }
    }
  }

  /**
   * Get a parameter value in ENGINE UNITS (0-1 for most params)
   * Note: Tools should use fromEngine() to convert to producer-friendly units
   * @param {string} path - e.g., 'kick.decay' or 'level' for node output
   * @returns {number}
   */
  getParam(path) {
    // 'level' handled by base InstrumentNode
    if (path === 'level') {
      return super.getParam(path);
    }
    return this._params[path];
  }

  /**
   * Set a parameter value (stores ENGINE UNITS, 0-1 normalized)
   * Tools convert from producer units before calling this.
   * @param {string} path - e.g., 'kick.decay'
   * @param {*} value - Value in engine units (0-1 for most params)
   * @returns {boolean}
   */
  setParam(path, value) {
    // 'level' handled by base InstrumentNode
    if (path === 'level') {
      return super.setParam(path, value);
    }

    // Handle mute (sets level to minimum engine value)
    const parts = path.split('.');
    if (parts.length === 2 && parts[1] === 'mute') {
      if (value) {
        this._params[`${parts[0]}.level`] = 0;
      }
      return true;
    }

    // Refuse unknown keys instead of storing them: "jb01.kik.decay" and
    // "jb01.kick.decayy" used to report "Set …" and change nothing.
    const descriptor = this._descriptors[path];
    if (!descriptor) {
      const voice = parts[0];
      const hint = VOICES.includes(voice)
        ? `valid for ${voice}: ${Object.keys(JB01_PARAMS[voice] || {}).join(', ')}`
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
      this._params[path] = v;
      return true;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      console.warn(`${this.id}: "${path}" expects a number, got ${JSON.stringify(value)}`);
      return false;
    }

    // setParam takes ENGINE units (0-1) as its contract. Do NOT guess units by
    // magnitude and silently convert — that was a second conversion path beside
    // converters.js that misclassified legitimate small producer values and made
    // read/write asymmetric (set 55 -> read 0.55). Producer->engine conversion
    // belongs at the tool boundary. Fail loudly on clearly out-of-range input
    // instead of guessing; store the value as given so read == write.
    if (parts.length === 2) {
      const [voice, paramName] = parts;
      const paramDef = JB01_PARAMS[voice]?.[paramName];
      if (paramDef && (paramDef.unit === '0-100' || paramDef.unit === 'dB') && (value < -1.5 || value > 1.5)) {
        console.warn(`JB01Node.setParam: ${path}=${value} is outside engine units (0-1); expected a producer->engine conversion at the tool boundary. Storing raw (not converting).`);
      }
    }

    this._params[path] = value;
    return true;
  }

  /**
   * Get a parameter value in engine units (0-1)
   * Used by render loop.
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    return this._params[path];
  }

  /**
   * Get all params for a voice in engine units
   * @param {string} voice
   * @returns {Object}
   */
  getVoiceEngineParams(voice) {
    const result = {};
    const voiceDef = JB01_PARAMS[voice];

    if (!voiceDef) return result;

    for (const paramName of Object.keys(voiceDef)) {
      const path = `${voice}.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        result[paramName] = value;
      }
    }

    return result;
  }

  /**
   * Get the current pattern
   * @returns {Object}
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Set the pattern
   * @param {Object} pattern - { kick: [...], snare: [...], ... }
   */
  setPattern(pattern) {
    this._pattern = normalizePattern(pattern);
  }

  /**
   * Set a single voice pattern
   * @param {string} voice
   * @param {Array} pattern
   */
  setVoicePattern(voice, pattern) {
    if (VOICES.includes(voice)) {
      this._pattern[voice] = pattern;
    }
  }

  /**
   * Get a single voice pattern
   * @param {string} voice
   * @returns {Array}
   */
  getVoicePattern(voice) {
    return this._pattern[voice] || createEmptyVoicePattern();
  }

  /**
   * Get pattern length in steps (uses kick pattern as reference)
   * @returns {number}
   */
  getPatternLength() {
    return patternLengthOf(this._pattern);
  }

  /**
   * Get pattern length in bars (16 steps = 1 bar)
   * @returns {number}
   */
  getPatternBars() {
    return this.getPatternLength() / 16;
  }

  /**
   * Resize pattern to new length (preserves existing steps, fills new steps with empty)
   * @param {number} steps - New pattern length in steps
   */
  resizePattern(steps) {
    const currentLength = this.getPatternLength();
    if (steps === currentLength) return;

    for (const voice of VOICES) {
      const current = this._pattern[voice] || [];
      if (steps < current.length) {
        this._pattern[voice] = current.slice(0, steps);
      } else {
        const empty = createEmptyVoicePattern(steps - current.length);
        this._pattern[voice] = [...current, ...empty];
      }
    }
  }

  /**
   * Render the pattern to an audio buffer
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render (pattern loops to fill)
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.swing - Swing amount (0-1)
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @param {Object} [options.pattern] - Optional pattern override (uses node's pattern if not provided)
   * @param {Object} [options.params] - Optional voice params override (uses node's params if not provided)
   * @returns {Promise<AudioBuffer>}
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
    const pattern = normalizePattern(options.pattern ?? this._pattern);

    // Check if pattern has any hits
    const hasHits = VOICES.some(voice =>
      pattern[voice]?.some(step => step?.velocity > 0)
    );
    if (!hasHits) {
      return null;
    }

    // Create engine with fresh context
    const context = new OfflineAudioContext(2, sampleRate, sampleRate);
    const engine = new JB01Engine({ context });

    // Apply voice params - use override if provided, otherwise node's internal params
    for (const voice of VOICES) {
      const voiceParams = params?.[voice] || this.getVoiceEngineParams(voice);
      for (const [paramId, value] of Object.entries(voiceParams)) {
        try {
          engine.setVoiceParam(voice, paramId, value);
        } catch (e) {
          // Ignore invalid params
        }
      }
    }

    // Convert automation from producer units to engine units
    // Automation uses node-relative paths: 'kick.decay', 'ch.level', etc.
    // Use node's own automation if no explicit automation passed
    const rawAutomation = automation || this._getAutomationForRender();
    let engineAutomation = undefined;
    if (rawAutomation && Object.keys(rawAutomation).length > 0) {
      engineAutomation = {};
      for (const [path, values] of Object.entries(rawAutomation)) {
        const [voice, param] = path.split('.');
        const paramDef = JB01_PARAMS[voice]?.[param];
        if (paramDef && Array.isArray(values)) {
          engineAutomation[path] = values.map(v =>
            v !== null && v !== undefined ? toEngine(v, paramDef) : null
          );
        }
      }
    }

    // Render pattern
    const buffer = await engine.renderPattern(pattern, {
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

  /**
   * Render each voice to a separate buffer (for per-voice effects)
   * Used by render.js when voice-level effect chains are present.
   *
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

    const voiceBuffers = {};

    // Convert automation from producer units to engine units, once.
    // (Same conversion as renderPattern — without this, adding any voice-level
    // effect silently disabled all parameter automation for the instrument.)
    const rawAutomation = automation || this._getAutomationForRender();
    let engineAutomation = undefined;
    if (rawAutomation && Object.keys(rawAutomation).length > 0) {
      engineAutomation = {};
      for (const [path, values] of Object.entries(rawAutomation)) {
        const [voice, param] = path.split('.');
        const paramDef = JB01_PARAMS[voice]?.[param];
        if (paramDef && Array.isArray(values)) {
          engineAutomation[path] = values.map(v =>
            v !== null && v !== undefined ? toEngine(v, paramDef) : null
          );
        }
      }
    }

    for (const voice of VOICES) {
      // Check if this voice has any hits
      const voicePattern = pattern[voice];
      const hasHits = voicePattern?.some(step => step?.velocity > 0);
      if (!hasHits) continue;

      // Create a pattern with only this voice
      const soloPattern = {};
      for (const v of VOICES) {
        if (v === voice) {
          soloPattern[v] = voicePattern;
        } else {
          soloPattern[v] = createEmptyVoicePattern(voicePattern.length);
        }
      }

      // Create engine with fresh context for this voice
      const context = new OfflineAudioContext(2, sampleRate, sampleRate);
      const engine = new JB01Engine({ context });

      // Apply voice params
      const voiceParams = params?.[voice] || this.getVoiceEngineParams(voice);
      for (const [paramId, value] of Object.entries(voiceParams)) {
        try {
          engine.setVoiceParam(voice, paramId, value);
        } catch (e) {
          // Ignore invalid params
        }
      }

      // Render just this voice (forward automation so per-voice effects
      // don't disable parameter automation)
      const buffer = await engine.renderPattern(soloPattern, {
        bars,
        stepDuration,
        swing,
        sampleRate,
        automation: engineAutomation,
      });

      if (buffer) {
        voiceBuffers[voice] = buffer;
      }
    }

    return voiceBuffers;
  }

  /**
   * Serialize full JB01 state
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
   * Deserialize JB01 state
   * Handles migration from legacy formats where producer values might have been stored
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) this._pattern = normalizePattern(JSON.parse(JSON.stringify(data.pattern)));
    if (data.params) {
      // Validate and convert params - handle legacy data with producer values
      const migratedParams = {};
      for (const [path, value] of Object.entries(data.params)) {
        // Drop keys with no descriptor and non-numeric values: saved tracks
        // may carry the old kit loader's object-valued keys (kick.kick, …) or
        // typos stored before setParam validated.
        const descriptor = this._descriptors[path];
        if (!descriptor) continue;
        if (descriptor.unit === 'choice') {
          const v = coerceChoice(descriptor, value);
          migratedParams[path] = v === undefined ? descriptor.default : v;
          continue;
        }
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;

        const [voice, paramName] = path.split('.');
        const paramDef = JB01_PARAMS[voice]?.[paramName];

        if (paramDef && typeof value === 'number') {
          // Check if value is outside engine range (0-1) for non-semitone params
          // This indicates legacy producer-unit data that needs conversion
          if (paramDef.unit === '0-100' && value > 1.5) {
            // Legacy producer value (e.g., 55 instead of 0.55)
            migratedParams[path] = toEngine(value, paramDef);
          } else if (paramDef.unit === 'dB' && value < -1.5) {
            // Legacy dB value (e.g., -6 instead of engine value)
            migratedParams[path] = toEngine(value, paramDef);
          } else {
            // Already in engine units
            migratedParams[path] = value;
          }
        } else {
          migratedParams[path] = value;
        }
      }
      this._params = migratedParams;
    }
  }
}

export { VOICES };
