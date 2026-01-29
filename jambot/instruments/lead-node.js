/**
 * LeadNode - Wrapper for SH-101 lead/poly synth
 *
 * Single-voice instrument with 16-step sequencer pattern.
 * Also supports arpeggiator mode.
 */

import { InstrumentNode } from '../core/node.js';
import { R1D1_PARAMS, toEngine, fromEngine } from '../params/converters.js';

export class LeadNode extends InstrumentNode {
  /**
   * @param {Object} config - Configuration
   * @param {Object} config.engine - SH101Engine instance (optional, for render)
   */
  constructor(config = {}) {
    super('lead', config);

    this._voices = ['lead'];
    this._engine = config.engine || null;

    // Preset tracking
    this._preset = config.preset || null;

    // Arpeggiator settings
    this._arp = {
      mode: 'off',    // 'off', 'up', 'down', 'updown'
      octaves: 1,
      hold: false,
    };

    // Initialize 16-step pattern
    this._pattern = this._createEmptyPattern();

    // Register all parameters from r1d1-params.json
    this._registerParams();
  }

  /**
   * Create empty 16-step pattern
   */
  _createEmptyPattern() {
    return Array(16).fill(null).map(() => ({
      note: 'C3',
      gate: false,
      accent: false,
      slide: false,
    }));
  }

  /**
   * Register all parameters from the JSON definition
   */
  _registerParams() {
    const leadDef = R1D1_PARAMS.lead;
    if (!leadDef) return;

    for (const [paramName, paramDef] of Object.entries(leadDef)) {
      this.registerParam(paramName, {
        ...paramDef,
        voice: 'lead',
        param: paramName,
      });
    }

    // Register arp params
    this.registerParam('arp.mode', { unit: 'choice', options: ['off', 'up', 'down', 'updown'], default: 'off' });
    this.registerParam('arp.octaves', { min: 1, max: 4, default: 1, unit: 'octaves' });
    this.registerParam('arp.hold', { unit: 'boolean', default: false });
  }

  /**
   * Get a parameter value in producer-friendly units
   * @param {string} path - e.g., 'cutoff' or 'lead.cutoff' or 'arp.mode'
   * @returns {*}
   */
  getParam(path) {
    // Handle arp params
    if (path.startsWith('arp.')) {
      const arpParam = path.slice(4);
      return this._arp[arpParam];
    }

    // Handle preset
    if (path === 'preset') {
      return this._preset;
    }

    // Strip 'lead.' prefix if present
    const paramName = path.startsWith('lead.') ? path.slice(5) : path;
    return this._params[paramName];
  }

  /**
   * Set a parameter value (accepts producer-friendly units)
   * @param {string} path - e.g., 'cutoff' or 'lead.cutoff' or 'arp.mode'
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    // Handle arp params
    if (path.startsWith('arp.')) {
      const arpParam = path.slice(4);
      if (arpParam in this._arp) {
        this._arp[arpParam] = value;
        return true;
      }
      return false;
    }

    // Handle preset
    if (path === 'preset') {
      this._preset = value;
      return true;
    }

    // Strip 'lead.' prefix if present
    const paramName = path.startsWith('lead.') ? path.slice(5) : path;

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
   * Get a parameter value converted to engine units
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const paramName = path.startsWith('lead.') ? path.slice(5) : path;
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
    const leadDef = R1D1_PARAMS.lead;

    for (const [paramName, paramDef] of Object.entries(leadDef)) {
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
   * Get arpeggiator settings
   * @returns {Object}
   */
  getArp() {
    return { ...this._arp };
  }

  /**
   * Set arpeggiator settings
   * @param {Object} arp
   */
  setArp(arp) {
    this._arp = { ...this._arp, ...arp };
  }

  /**
   * Set the SH101Engine instance (called during render setup)
   * @param {Object} engine
   */
  setEngine(engine) {
    this._engine = engine;
  }

  /**
   * Trigger a note
   * @param {string} voice - Ignored for lead (single voice)
   * @param {number} time - Audio context time
   * @param {number} velocity - 0-1 velocity
   * @param {Object} options - { note, accent, slide }
   */
  trigger(voice, time, velocity, options = {}) {
    if (!this._engine) {
      console.warn('LeadNode: No engine attached');
      return;
    }

    this._engine.noteOn(options.note || 'C3', time, {
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
   * Get parameter descriptors with 'lead.' prefix for unified interface
   * @returns {Object}
   */
  getParameterDescriptors() {
    const result = {};
    for (const [path, descriptor] of Object.entries(this._descriptors)) {
      // Skip arp params in main descriptors
      if (!path.startsWith('arp.')) {
        result[`lead.${path}`] = descriptor;
      }
    }
    // Add arp params
    result['arp.mode'] = this._descriptors['arp.mode'];
    result['arp.octaves'] = this._descriptors['arp.octaves'];
    result['arp.hold'] = this._descriptors['arp.hold'];

    return result;
  }

  /**
   * Serialize full lead state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      preset: this._preset,
      pattern: this._pattern,
      params: { ...this._params },
      arp: { ...this._arp },
    };
  }

  /**
   * Deserialize lead state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.preset !== undefined) this._preset = data.preset;
    if (data.pattern) this._pattern = data.pattern;
    if (data.params) this._params = { ...data.params };
    if (data.arp) this._arp = { ...data.arp };
  }
}
