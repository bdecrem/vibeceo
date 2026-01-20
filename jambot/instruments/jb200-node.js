/**
 * JB200Node - Bass Monosynth
 *
 * 2-oscillator bass synth with filter, envelopes, and drive.
 * Exposes parameters through the unified parameter system.
 */

import { InstrumentNode } from '../core/node.js';
import { JB200_PARAMS, toEngine, fromEngine } from '../params/converters.js';

// Voice (monophonic)
const VOICES = ['bass'];

/**
 * Create an empty 16-step pattern
 */
function createEmptyPattern() {
  return Array(16).fill(null).map(() => ({
    note: 'C2',
    gate: false,
    accent: false,
    slide: false,
  }));
}

export class JB200Node extends InstrumentNode {
  constructor(config = {}) {
    super('jb200', config);

    this._voices = VOICES;

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Register all parameters from jb200-params.json
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally for compatibility with render loop
   */
  _registerParams() {
    const bassDef = JB200_PARAMS.bass;
    if (!bassDef) return;

    for (const [paramName, paramDef] of Object.entries(bassDef)) {
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
   * Get a parameter value in producer-friendly units
   * @param {string} path - e.g., 'bass.filterCutoff' or 'filterCutoff' (shorthand)
   * @returns {*}
   */
  getParam(path) {
    // Normalize path - add 'bass.' prefix if missing
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
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
    // Normalize path
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;

    // Handle mute (sets level to minimum engine value)
    if (normalizedPath === 'bass.mute' || path === 'mute') {
      if (value) {
        this._params['bass.level'] = 0; // 0 = silent in engine units
      }
      return true;
    }

    // Store engine value directly - no clamping needed
    // The descriptors have producer-friendly ranges (Hz, dB, etc.)
    // but we store engine units (0-1), so clamping against those ranges would be wrong.
    // Tools are responsible for validation before conversion.
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
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Get all params for bass voice in engine units
   * Values are already stored in engine units (0-1), so we return them directly.
   * @returns {Object}
   */
  getEngineParams() {
    const result = {};
    const bassDef = JB200_PARAMS.bass;

    if (!bassDef) return result;

    for (const paramName of Object.keys(bassDef)) {
      const path = `bass.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        // Values already in engine units - return directly
        result[paramName] = value;
      }
    }

    return result;
  }

  /**
   * Get node output level as linear gain multiplier
   * Level is stored in engine units (0-1 where 0.5 = 0dB = unity, 1.0 = +6dB)
   * @returns {number} Linear gain (1.0 = unity, 2.0 = +6dB)
   */
  getOutputGain() {
    // Level stored as engine units: 0-1 where 1.0 = +6dB (linear 2.0)
    const levelEngine = this._params['bass.level'] ?? 0.5; // 0.5 = 0dB (unity)
    const maxLinear = Math.pow(10, 6 / 20); // 2.0 for +6dB max
    return levelEngine * maxLinear;
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
   * @param {Array} pattern - 16-step pattern array
   */
  setPattern(pattern) {
    this._pattern = pattern;
  }

  /**
   * Serialize full JB200 state
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
   * Deserialize JB200 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
  }
}
