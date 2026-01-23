/**
 * SH101Node - Wrapper for SH-101 lead synthesizer
 *
 * Monophonic lead synth with sequencer and arpeggiator.
 * Exposes parameters through the unified parameter system.
 */

import { InstrumentNode } from '../core/node.js';
import { R1D1_PARAMS, toEngine, fromEngine } from '../params/converters.js';
import { OfflineAudioContext } from 'node-web-audio-api';

// Voice (monophonic, but can do polyphony with arp)
const VOICES = ['lead'];

/**
 * Create an empty 16-step pattern
 * @param {number} steps - Number of steps (default 16 = 1 bar)
 */
function createEmptyPattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: 'C3',
    gate: false,
    accent: false,
    slide: false,
  }));
}

export class SH101Node extends InstrumentNode {
  constructor(config = {}) {
    super('lead', config);

    this._voices = VOICES;

    // Initialize pattern
    this._pattern = createEmptyPattern();

    // Preset ID
    this._preset = null;

    // Arpeggiator settings
    this._arp = {
      mode: 'off', // 'off', 'up', 'down', 'updown'
      octaves: 1,
      hold: false,
    };

    // Node output level in dB (-60 to +6, 0 = unity)
    this._level = 0;

    // Register all parameters
    this._registerParams();
  }

  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally
   */
  _registerParams() {
    // Node-level output gain
    this.registerParam('level', { min: -60, max: 6, default: 0, unit: 'dB', hint: 'node output level' });

    const leadDef = R1D1_PARAMS.lead;
    if (!leadDef) return;

    for (const [paramName, paramDef] of Object.entries(leadDef)) {
      const path = `lead.${paramName}`;
      this.registerParam(path, {
        ...paramDef,
        voice: 'lead',
        param: paramName,
      });

      // Initialize with default value in engine units
      if (paramDef.default !== undefined) {
        this._params[path] = toEngine(paramDef.default, paramDef);
      }
    }
  }

  /**
   * Get a parameter value
   * @param {string} path - e.g., 'lead.cutoff' or 'cutoff'
   * @returns {*}
   */
  getParam(path) {
    if (path === 'level') return this._level;
    if (path === 'preset') return this._preset;

    // Normalize path
    const normalizedPath = path.startsWith('lead.') ? path : `lead.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Set a parameter value (stores ENGINE UNITS)
   * @param {string} path - e.g., 'lead.cutoff' or 'cutoff'
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    if (path === 'level') {
      this._level = Math.max(-60, Math.min(6, value));
      return true;
    }
    if (path === 'preset') {
      this._preset = value;
      return true;
    }

    // Normalize path
    const normalizedPath = path.startsWith('lead.') ? path : `lead.${path}`;

    // Handle mute
    if (normalizedPath === 'lead.mute' || path === 'mute') {
      if (value) {
        this._params['lead.level'] = 0;
      }
      return true;
    }

    this._params[normalizedPath] = value;
    return true;
  }

  /**
   * Get a parameter value in engine units
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const normalizedPath = path.startsWith('lead.') ? path : `lead.${path}`;
    return this._params[normalizedPath];
  }

  /**
   * Get all params for lead voice in engine units
   * @returns {Object}
   */
  getEngineParams() {
    const result = {};
    const leadDef = R1D1_PARAMS.lead;

    if (!leadDef) return result;

    for (const paramName of Object.keys(leadDef)) {
      const path = `lead.${paramName}`;
      const value = this._params[path];

      if (value !== undefined) {
        result[paramName] = value;
      }
    }

    return result;
  }

  /**
   * Get node output level as linear gain multiplier
   * @returns {number}
   */
  getOutputGain() {
    return Math.pow(10, this._level / 20);
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
    if (arp.mode !== undefined) this._arp.mode = arp.mode;
    if (arp.octaves !== undefined) this._arp.octaves = arp.octaves;
    if (arp.hold !== undefined) this._arp.hold = arp.hold;
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
   * @param {Array} pattern
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
   * Render the pattern to an audio buffer
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @param {Array} [options.pattern] - Optional pattern override
   * @param {Object} [options.params] - Optional params override
   * @returns {Promise<AudioBuffer>}
   */
  async renderPattern(options) {
    const {
      bars,
      stepDuration,
      sampleRate = 44100,
      pattern = this._pattern,
      params = null,
    } = options;

    // Check if pattern has any active notes
    if (!pattern?.some(s => s.gate)) {
      return null;
    }

    // Dynamic import to avoid circular dependencies
    const SH101Mod = await import('../../web/public/101/dist/machines/sh101/engine.js');
    const SH101Engine = SH101Mod.SH101Engine || SH101Mod.default;

    // Calculate BPM from stepDuration for legacy engine API
    // stepDuration = 60 / bpm / 4, so bpm = 60 / stepDuration / 4
    const bpm = 60 / stepDuration / 4;

    // Create a fresh engine for offline rendering
    // Note: SH101Engine.renderPattern creates its own offline context
    const initContext = new OfflineAudioContext(2, sampleRate, sampleRate);
    const lead = new SH101Engine({ context: initContext, engine: 'E1' });

    // Apply params - use override if provided, otherwise node's internal params
    const engineParams = params || this.getEngineParams();
    Object.entries(engineParams).forEach(([key, value]) => {
      // Map 'level' to 'volume' for SH101Engine
      const paramKey = key === 'level' ? 'volume' : key;
      lead.setParameter(paramKey, value);
    });

    // Set pattern on engine
    lead.setPattern(pattern);

    // Render using engine's built-in renderPattern
    const buffer = await lead.renderPattern({ bars, bpm });

    return buffer;
  }

  /**
   * Serialize full SH101 state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      preset: this._preset,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
      level: this._level,
      arp: { ...this._arp },
    };
  }

  /**
   * Deserialize SH101 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.preset) this._preset = data.preset;
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
    if (data.level !== undefined) this._level = data.level;
    if (data.arp) this._arp = { ...data.arp };
  }
}

export { VOICES };
