/**
 * DrumsNode - Wrapper for TR-909 drum machine
 *
 * Exposes all 11 voices through the unified parameter system.
 * Handles producer-friendly units (dB, 0-100, semitones, Hz) internally.
 */

import { InstrumentNode } from '../core/node.js';
import { R9D9_PARAMS, toEngine, fromEngine } from '../params/converters.js';

// All TR-909 voices
const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'];

export class DrumsNode extends InstrumentNode {
  /**
   * @param {Object} config - Configuration
   * @param {Object} config.engine - TR909Engine instance (optional, for render)
   */
  constructor(config = {}) {
    super('drums', config);

    this._voices = VOICES;
    this._engine = config.engine || null;

    // Additional drum-specific state
    this._kit = config.kit || 'bart-deep';
    this._level = 0;  // Node output level in dB (-60 to +6, 0 = unity)
    this._flam = 0;
    this._patternLength = 16;
    this._scale = '16th';
    this._globalAccent = 1;
    this._voiceEngines = {};  // Per-voice engine selection
    this._useSample = {};     // Sample mode for hats/cymbals

    // Initialize pattern as object of voice patterns
    this._pattern = {};
    for (const voice of VOICES) {
      this._pattern[voice] = [];
    }

    // Register all parameters from r9d9-params.json
    this._registerParams();
  }

  /**
   * Register all voice parameters from the JSON definition
   */
  _registerParams() {
    for (const voice of VOICES) {
      const voiceDef = R9D9_PARAMS[voice];
      if (!voiceDef) continue;

      for (const [paramName, paramDef] of Object.entries(voiceDef)) {
        const path = `${voice}.${paramName}`;
        this.registerParam(path, {
          ...paramDef,
          voice,
          param: paramName,
        });
      }
    }

    // Register drum-specific params (not per-voice)
    this.registerParam('level', { min: -60, max: 6, default: 0, unit: 'dB', hint: 'node output level' });
    this.registerParam('flam', { min: 0, max: 100, default: 0, unit: '0-100' });
    this.registerParam('patternLength', { min: 1, max: 64, default: 16, unit: 'steps' });
    this.registerParam('globalAccent', { min: 0, max: 100, default: 100, unit: '0-100' });
  }

  /**
   * Get a parameter value in producer-friendly units
   * @param {string} path - e.g., 'kick.decay' or 'flam'
   * @returns {*}
   */
  getParam(path) {
    // Handle drum-level params
    if (path === 'level') return this._level;
    if (path === 'flam') return this._flam;
    if (path === 'patternLength') return this._patternLength;
    if (path === 'scale') return this._scale;
    if (path === 'globalAccent') return this._globalAccent * 100;
    if (path === 'kit') return this._kit;

    // Voice params
    return this._params[path];
  }

  /**
   * Set a parameter value (accepts producer-friendly units)
   * @param {string} path - e.g., 'kick.decay' or 'flam'
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    // Handle drum-level params
    if (path === 'level') {
      this._level = Math.max(-60, Math.min(6, value));
      return true;
    }
    if (path === 'flam') {
      this._flam = Math.max(0, Math.min(100, value));
      return true;
    }
    if (path === 'patternLength') {
      this._patternLength = Math.max(1, Math.min(64, Math.floor(value)));
      return true;
    }
    if (path === 'scale') {
      this._scale = value;
      return true;
    }
    if (path === 'globalAccent') {
      this._globalAccent = Math.max(0, Math.min(100, value)) / 100;
      return true;
    }
    if (path === 'kit') {
      this._kit = value;
      return true;
    }

    // Handle voice engine selection
    if (path.endsWith('.engine')) {
      const voice = path.split('.')[0];
      this._voiceEngines[voice] = value;
      return true;
    }

    // Handle sample mode
    if (path.endsWith('.useSample')) {
      const voice = path.split('.')[0];
      this._useSample[voice] = value;
      return true;
    }

    // Handle mute
    if (path.endsWith('.mute')) {
      const voice = path.split('.')[0];
      // Mute by setting level to -60dB
      if (value) {
        this._params[`${voice}.level`] = -60;
      }
      return true;
    }

    // Standard voice params - store in producer units
    const descriptor = this._descriptors[path];
    if (descriptor) {
      // Clamp to valid range
      if (descriptor.min !== undefined && value < descriptor.min) {
        value = descriptor.min;
      }
      if (descriptor.max !== undefined && value > descriptor.max) {
        value = descriptor.max;
      }
    }

    this._params[path] = value;
    return true;
  }

  /**
   * Get a parameter value converted to engine units (0-1)
   * Used by render loop
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const value = this.getParam(path);
    const descriptor = this._descriptors[path];

    if (!descriptor) return value;

    return toEngine(value, descriptor);
  }

  /**
   * Get all params for a voice in engine units
   * @param {string} voice
   * @returns {Object}
   */
  getVoiceEngineParams(voice) {
    const result = {};
    const voiceDef = R9D9_PARAMS[voice];

    if (!voiceDef) return result;

    for (const paramName of Object.keys(voiceDef)) {
      const path = `${voice}.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        result[paramName] = toEngine(value, voiceDef[paramName]);
      }
    }

    return result;
  }

  /**
   * Get node output level as linear gain multiplier
   * Used by render loop to apply node-level gain
   * @returns {number} Linear gain (1.0 = unity, 2.0 = +6dB)
   */
  getOutputGain() {
    return Math.pow(10, this._level / 20);
  }

  /**
   * Set the TR909Engine instance (called during render setup)
   * @param {Object} engine
   */
  setEngine(engine) {
    this._engine = engine;
  }

  /**
   * Trigger a drum voice
   * @param {string} voice - Voice ID
   * @param {number} time - Audio context time
   * @param {number} velocity - 0-1 velocity
   * @param {Object} options - { accent, flam }
   */
  trigger(voice, time, velocity, options = {}) {
    if (!this._engine) {
      console.warn('DrumsNode: No engine attached');
      return;
    }

    // Get voice params in engine units
    const params = this.getVoiceEngineParams(voice);

    // Apply velocity to level
    const level = params.level !== undefined ? params.level * velocity : velocity;

    // Apply flam if set
    const flamTime = options.flam || this._flam / 100;

    // Trigger on engine
    this._engine.trigger(voice, time, level, {
      accent: options.accent,
      flam: flamTime,
      ...params,
    });
  }

  /**
   * Get pattern for a voice
   * @param {string} [voice] - If provided, get specific voice pattern
   * @returns {Object|Array}
   */
  getPattern(voice) {
    if (voice) {
      return this._pattern[voice] || [];
    }
    return this._pattern;
  }

  /**
   * Set pattern
   * @param {Object|Array} pattern - Full pattern object or single voice pattern
   * @param {string} [voice] - If provided, set specific voice pattern
   */
  setPattern(pattern, voice) {
    if (voice) {
      this._pattern[voice] = pattern;
    } else {
      this._pattern = pattern;
    }
  }

  /**
   * Serialize full drum state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      kit: this._kit,
      level: this._level,
      pattern: this._pattern,
      params: { ...this._params },
      flam: this._flam,
      patternLength: this._patternLength,
      scale: this._scale,
      globalAccent: this._globalAccent,
      voiceEngines: { ...this._voiceEngines },
      useSample: { ...this._useSample },
    };
  }

  /**
   * Deserialize drum state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.kit) this._kit = data.kit;
    if (data.level !== undefined) this._level = data.level;
    if (data.pattern) this._pattern = data.pattern;
    if (data.params) this._params = { ...data.params };
    if (data.flam !== undefined) this._flam = data.flam;
    if (data.patternLength !== undefined) this._patternLength = data.patternLength;
    if (data.scale) this._scale = data.scale;
    if (data.globalAccent !== undefined) this._globalAccent = data.globalAccent;
    if (data.voiceEngines) this._voiceEngines = { ...data.voiceEngines };
    if (data.useSample) this._useSample = { ...data.useSample };
  }
}
