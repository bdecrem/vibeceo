/**
 * JB01Node - Reference Drum Machine
 *
 * 8-voice drum machine with pattern storage.
 * Exposes parameters through the unified parameter system.
 */

import { InstrumentNode } from '../core/node.js';
import { JB01_PARAMS, toEngine, fromEngine } from '../params/converters.js';

// Voice IDs
const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'perc', 'tom', 'cymbal'];

/**
 * Create an empty 16-step pattern for one voice
 */
function createEmptyVoicePattern() {
  return Array(16).fill(null).map(() => ({
    velocity: 0,
    accent: false,
  }));
}

/**
 * Create an empty pattern for all voices
 */
function createEmptyPattern() {
  const pattern = {};
  for (const voice of VOICES) {
    pattern[voice] = createEmptyVoicePattern();
  }
  return pattern;
}

export class JB01Node extends InstrumentNode {
  constructor(config = {}) {
    super('jb01', config);

    this._voices = VOICES;

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
        if (paramDef.default !== undefined) {
          this._params[path] = toEngine(paramDef.default, paramDef);
        }
      }
    }
  }

  /**
   * Get a parameter value in ENGINE UNITS (0-1 for most params)
   * Note: Tools should use fromEngine() to convert to producer-friendly units
   * @param {string} path - e.g., 'kick.decay'
   * @returns {number}
   */
  getParam(path) {
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
    // Handle mute (sets level to minimum engine value)
    const parts = path.split('.');
    if (parts.length === 2 && parts[1] === 'mute') {
      if (value) {
        this._params[`${parts[0]}.level`] = 0;
      }
      return true;
    }

    // Validate: warn if value appears to be in producer units instead of engine units
    if (typeof value === 'number' && parts.length === 2) {
      const [voice, paramName] = parts;
      const paramDef = JB01_PARAMS[voice]?.[paramName];
      if (paramDef) {
        if (paramDef.unit === '0-100' && value > 1.5) {
          console.warn(`JB01Node.setParam: ${path}=${value} appears to be producer units (0-100), expected engine units (0-1). Converting automatically.`);
          value = toEngine(value, paramDef);
        } else if (paramDef.unit === 'dB' && value < -1.5 && value >= -60) {
          console.warn(`JB01Node.setParam: ${path}=${value} appears to be dB, expected engine units (0-1). Converting automatically.`);
          value = toEngine(value, paramDef);
        }
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
   * Get node output level as linear gain multiplier
   * Returns 1.0 (unity) - individual voice levels are handled separately
   * @returns {number}
   */
  getOutputGain() {
    return 1.0;
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
    this._pattern = pattern;
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
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) {
      // Validate and convert params - handle legacy data with producer values
      const migratedParams = {};
      for (const [path, value] of Object.entries(data.params)) {
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
