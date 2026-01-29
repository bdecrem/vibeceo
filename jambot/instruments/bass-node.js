/**
 * BassNode - Wrapper for TB-303 acid bass synth
 *
 * Single-voice instrument with 16-step sequencer pattern.
 * Handles producer-friendly units internally.
 */

import { InstrumentNode } from '../core/node.js';
import { R3D3_PARAMS, toEngine, fromEngine } from '../params/converters.js';

export class BassNode extends InstrumentNode {
  /**
   * @param {Object} config - Configuration
   * @param {Object} config.engine - TB303Engine instance (optional, for render)
   */
  constructor(config = {}) {
    super('bass', config);

    this._voices = ['bass'];
    this._engine = config.engine || null;

    // Initialize 16-step pattern
    this._pattern = this._createEmptyPattern();

    // Register all parameters from r3d3-params.json
    this._registerParams();
  }

  /**
   * Create empty 16-step pattern
   */
  _createEmptyPattern() {
    return Array(16).fill(null).map(() => ({
      note: 'C2',
      gate: false,
      accent: false,
      slide: false,
    }));
  }

  /**
   * Register all parameters from the JSON definition
   */
  _registerParams() {
    const bassDef = R3D3_PARAMS.bass;
    if (!bassDef) return;

    for (const [paramName, paramDef] of Object.entries(bassDef)) {
      this.registerParam(paramName, {
        ...paramDef,
        voice: 'bass',
        param: paramName,
      });
    }
  }

  /**
   * Get a parameter value in producer-friendly units
   * @param {string} path - e.g., 'cutoff' or 'bass.cutoff' (both work)
   * @returns {*}
   */
  getParam(path) {
    // Strip 'bass.' prefix if present (for unified interface)
    const paramName = path.startsWith('bass.') ? path.slice(5) : path;
    return this._params[paramName];
  }

  /**
   * Set a parameter value (accepts producer-friendly units)
   * @param {string} path - e.g., 'cutoff' or 'bass.cutoff'
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    // Strip 'bass.' prefix if present
    const paramName = path.startsWith('bass.') ? path.slice(5) : path;

    // Handle mute
    if (paramName === 'mute') {
      if (value) {
        this._params.level = -60;
      }
      return true;
    }

    const descriptor = this._descriptors[paramName];
    if (descriptor) {
      // Handle choice params
      if (descriptor.unit === 'choice') {
        if (descriptor.options && descriptor.options.includes(value)) {
          this._params[paramName] = value;
          return true;
        }
        return false;
      }

      // Clamp numeric values
      if (descriptor.min !== undefined && value < descriptor.min) {
        value = descriptor.min;
      }
      if (descriptor.max !== undefined && value > descriptor.max) {
        value = descriptor.max;
      }
    }

    this._params[paramName] = value;
    return true;
  }

  /**
   * Get a parameter value converted to engine units (0-1)
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const paramName = path.startsWith('bass.') ? path.slice(5) : path;
    const value = this._params[paramName];
    const descriptor = this._descriptors[paramName];

    if (!descriptor || descriptor.unit === 'choice') return value;

    return toEngine(value, descriptor);
  }

  /**
   * Get all params in engine units
   * @returns {Object}
   */
  getAllEngineParams() {
    const result = {};
    const bassDef = R3D3_PARAMS.bass;

    for (const [paramName, paramDef] of Object.entries(bassDef)) {
      const value = this._params[paramName];
      if (value !== undefined) {
        if (paramDef.unit === 'choice') {
          result[paramName] = value;
        } else {
          result[paramName] = toEngine(value, paramDef);
        }
      }
    }

    return result;
  }

  /**
   * Set the TB303Engine instance (called during render setup)
   * @param {Object} engine
   */
  setEngine(engine) {
    this._engine = engine;
  }

  /**
   * Trigger a note
   * @param {string} voice - Ignored for bass (single voice)
   * @param {number} time - Audio context time
   * @param {number} velocity - 0-1 velocity
   * @param {Object} options - { note, accent, slide }
   */
  trigger(voice, time, velocity, options = {}) {
    if (!this._engine) {
      console.warn('BassNode: No engine attached');
      return;
    }

    this._engine.noteOn(options.note || 'C2', time, {
      velocity,
      accent: options.accent,
      slide: options.slide,
    });
  }

  /**
   * Release note
   * @param {number} time - Audio context time
   */
  release(time) {
    if (this._engine) {
      this._engine.noteOff(time);
    }
  }

  /**
   * Get the 16-step pattern
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
   * Get parameter descriptors with 'bass.' prefix for unified interface
   * @returns {Object}
   */
  getParameterDescriptors() {
    const result = {};
    for (const [path, descriptor] of Object.entries(this._descriptors)) {
      result[`bass.${path}`] = descriptor;
    }
    return result;
  }

  /**
   * Serialize full bass state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      pattern: this._pattern,
      params: { ...this._params },
    };
  }

  /**
   * Deserialize bass state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) this._pattern = data.pattern;
    if (data.params) this._params = { ...data.params };
  }
}
