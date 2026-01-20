/**
 * FilterNode - LP/HP/BP filter effect
 *
 * Parameters:
 * - mode: 'lowpass', 'highpass', 'bandpass'
 * - cutoff (Hz): Filter frequency
 * - resonance (0-100): Filter Q/resonance
 */

import { EffectNode } from '../core/node.js';

// Filter Presets
export const FILTER_PRESETS = {
  dubDelay: {
    mode: 'lowpass',
    cutoff: 800,
    resonance: 30,
  },
  telephone: {
    mode: 'bandpass',
    cutoff: 1500,
    resonance: 50,
  },
  lofi: {
    mode: 'lowpass',
    cutoff: 3000,
    resonance: 20,
  },
  darkRoom: {
    mode: 'lowpass',
    cutoff: 400,
    resonance: 40,
  },
  airFilter: {
    mode: 'highpass',
    cutoff: 500,
    resonance: 20,
  },
  thinOut: {
    mode: 'highpass',
    cutoff: 1000,
    resonance: 10,
  },
};

export class FilterNode extends EffectNode {
  constructor(id = 'filter', config = {}) {
    super(id, config);

    // Track preset
    this._preset = config.preset || null;

    // Register filter parameters
    this.registerParams({
      mode: { unit: 'choice', options: ['lowpass', 'highpass', 'bandpass'], default: 'lowpass', description: 'Filter type' },
      cutoff: { min: 20, max: 20000, default: 2000, unit: 'Hz', description: 'Filter frequency' },
      resonance: { min: 0, max: 100, default: 30, unit: '0-100', description: 'Filter Q (0=gentle, 100=screaming)' },
    });

    // Apply preset if provided
    if (config.preset && FILTER_PRESETS[config.preset]) {
      this.loadPreset(config.preset);
    }
  }

  /**
   * Load a preset by name
   * @param {string} presetName
   */
  loadPreset(presetName) {
    const preset = FILTER_PRESETS[presetName];
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
