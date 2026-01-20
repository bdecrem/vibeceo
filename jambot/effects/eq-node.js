/**
 * EQNode - Parametric EQ effect
 *
 * Parameters:
 * - highpass (Hz): Cut frequencies below this
 * - lowGain (dB): Low shelf boost/cut
 * - midGain (dB): Mid peak boost/cut
 * - midFreq (Hz): Mid peak frequency
 * - midQ (0.1-10): Mid peak width
 * - highGain (dB): High shelf boost/cut
 */

import { EffectNode } from '../core/node.js';

// EQ Presets
export const EQ_PRESETS = {
  acidBass: {
    highpass: 30,
    lowGain: 2,
    midFreq: 800,
    midGain: 3,
    midQ: 2,
    highGain: -2,
  },
  crispHats: {
    highpass: 2000,
    lowGain: 0,
    midFreq: 8000,
    midGain: 2,
    midQ: 1,
    highGain: 3,
  },
  warmPad: {
    highpass: 80,
    lowGain: 1,
    midFreq: 3000,
    midGain: -2,
    midQ: 0.5,
    highGain: -3,
  },
  punchyKick: {
    highpass: 30,
    lowGain: 3,
    midFreq: 100,
    midGain: 2,
    midQ: 3,
    highGain: -1,
  },
  cleanSnare: {
    highpass: 100,
    lowGain: -1,
    midFreq: 200,
    midGain: 2,
    midQ: 2,
    highGain: 2,
  },
  master: {
    highpass: 30,
    lowGain: 1,
    midFreq: 3000,
    midGain: 0,
    midQ: 0.5,
    highGain: 1,
  },
};

export class EQNode extends EffectNode {
  constructor(id = 'eq', config = {}) {
    super(id, config);

    // Track preset
    this._preset = config.preset || null;

    // Register all EQ parameters
    this.registerParams({
      highpass: { min: 20, max: 2000, default: 30, unit: 'Hz', description: 'Cut below this frequency' },
      lowGain: { min: -12, max: 12, default: 0, unit: 'dB', description: 'Low shelf boost/cut' },
      midFreq: { min: 100, max: 10000, default: 1000, unit: 'Hz', description: 'Mid peak frequency' },
      midGain: { min: -12, max: 12, default: 0, unit: 'dB', description: 'Mid peak boost/cut' },
      midQ: { min: 0.1, max: 10, default: 1, unit: 'Q', description: 'Mid peak width (higher = narrower)' },
      highGain: { min: -12, max: 12, default: 0, unit: 'dB', description: 'High shelf boost/cut' },
    });

    // Apply preset if provided
    if (config.preset && EQ_PRESETS[config.preset]) {
      this.loadPreset(config.preset);
    }
  }

  /**
   * Load a preset by name
   * @param {string} presetName
   */
  loadPreset(presetName) {
    const preset = EQ_PRESETS[presetName];
    if (!preset) return false;

    this._preset = presetName;
    for (const [param, value] of Object.entries(preset)) {
      this.setParam(param, value);
    }
    return true;
  }

  /**
   * Get current preset name
   * @returns {string|null}
   */
  getPreset() {
    return this._preset;
  }

  /**
   * Get all params as an object for render
   * @returns {Object}
   */
  getParams() {
    const result = {};
    for (const path of Object.keys(this._descriptors)) {
      result[path] = this._params[path];
    }
    return result;
  }

  serialize() {
    return {
      ...super.serialize(),
      preset: this._preset,
    };
  }

  deserialize(data) {
    super.deserialize(data);
    if (data.preset) {
      this._preset = data.preset;
    }
  }
}
