/**
 * R2D2Node - Bass Monosynth
 *
 * 2-oscillator bass synth with filter, envelopes, and drive.
 * Exposes parameters through the unified parameter system.
 */

import { InstrumentNode } from '../core/node.js';
import { R2D2_PARAMS, toEngine, fromEngine } from '../params/converters.js';

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

export class R2D2Node extends InstrumentNode {
  constructor(config = {}) {
    super('r2d2', config);

    this._voices = VOICES;
    this._engine = config.engine || null;

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Register all parameters from r2d2-params.json
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   */
  _registerParams() {
    const bassDef = R2D2_PARAMS.bass;
    if (!bassDef) return;

    for (const [paramName, paramDef] of Object.entries(bassDef)) {
      const path = `bass.${paramName}`;
      this.registerParam(path, {
        ...paramDef,
        voice: 'bass',
        param: paramName,
      });
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
   * Set a parameter value (accepts producer-friendly units)
   * @param {string} path - e.g., 'bass.filterCutoff' or 'filterCutoff'
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    // Normalize path
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;

    // Handle mute
    if (normalizedPath === 'bass.mute' || path === 'mute') {
      if (value) {
        this._params['bass.level'] = -60;
      }
      return true;
    }

    const descriptor = this._descriptors[normalizedPath];
    if (descriptor) {
      // Clamp to valid range
      if (descriptor.min !== undefined && typeof value === 'number' && value < descriptor.min) {
        value = descriptor.min;
      }
      if (descriptor.max !== undefined && typeof value === 'number' && value > descriptor.max) {
        value = descriptor.max;
      }
    }

    this._params[normalizedPath] = value;
    return true;
  }

  /**
   * Get a parameter value converted to engine units (0-1)
   * Used by render loop
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const normalizedPath = path.startsWith('bass.') ? path : `bass.${path}`;
    const value = this.getParam(normalizedPath);
    const descriptor = this._descriptors[normalizedPath];

    if (!descriptor) return value;

    return toEngine(value, descriptor);
  }

  /**
   * Get all params for bass voice in engine units
   * @returns {Object}
   */
  getEngineParams() {
    const result = {};
    const bassDef = R2D2_PARAMS.bass;

    if (!bassDef) return result;

    for (const paramName of Object.keys(bassDef)) {
      const path = `bass.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        result[paramName] = toEngine(value, bassDef[paramName]);
      }
    }

    return result;
  }

  /**
   * Get node output level as linear gain multiplier
   * @returns {number} Linear gain (1.0 = unity, 2.0 = +6dB)
   */
  getOutputGain() {
    const level = this._params['bass.level'] ?? 0;
    return Math.pow(10, level / 20);
  }

  /**
   * Set the R2D2Engine instance (called during render setup)
   * @param {Object} engine
   */
  setEngine(engine) {
    this._engine = engine;
  }

  /**
   * Trigger a note
   * @param {string} voice - Voice ID (always 'bass' for monophonic)
   * @param {number} time - Audio context time
   * @param {number} velocity - 0-1 velocity
   * @param {Object} options - { accent, slide, note }
   */
  trigger(voice, time, velocity, options = {}) {
    if (!this._engine) {
      console.warn('R2D2Node: No engine attached');
      return;
    }

    // Get params in engine units
    const params = this.getEngineParams();

    this._engine.trigger(time, options.note || 'C2', velocity, {
      accent: options.accent,
      slide: options.slide,
      ...params,
    });
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
   * Serialize full R2D2 state
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
   * Deserialize R2D2 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
  }
}
